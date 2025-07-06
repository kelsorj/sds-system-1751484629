#!/usr/bin/env python3
"""
Direct database migration script to transfer data from SQLite to PostgreSQL
Using direct connections instead of SQLAlchemy
"""

import os
import sys
import sqlite3
import psycopg2
import pandas as pd
import time

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import settings
from config.settings import settings

def get_sqlite_tables():
    """Get list of tables from SQLite database"""
    sqlite_conn = sqlite3.connect('./database/sds_system.db')
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    cursor.close()
    sqlite_conn.close()
    return [table[0] for table in tables if not table[0].startswith('sqlite_')]

def get_sqlite_table_schema(table_name):
    """Get schema for a SQLite table"""
    sqlite_conn = sqlite3.connect('./database/sds_system.db')
    cursor = sqlite_conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    schema = cursor.fetchall()
    cursor.close()
    sqlite_conn.close()
    return schema

def get_postgres_data_type(sqlite_type):
    """Convert SQLite data type to PostgreSQL data type"""
    type_map = {
        'INTEGER': 'INTEGER',
        'REAL': 'FLOAT',
        'TEXT': 'TEXT',
        'BLOB': 'BYTEA',
        'BOOLEAN': 'BOOLEAN',
        'DATETIME': 'TIMESTAMP',
        'TIMESTAMP': 'TIMESTAMP',
        'DATE': 'DATE',
        'TIME': 'TIME',
        'FLOAT': 'FLOAT',
        'DOUBLE': 'DOUBLE PRECISION',
        'CHAR': 'CHAR',
        'VARCHAR': 'VARCHAR',
    }
    
    # Default to TEXT for unknown types
    for key in type_map:
        if key in sqlite_type.upper():
            return type_map[key]
    return 'TEXT'

def create_postgres_table(table_name, schema, pg_conn_string):
    """Create table in PostgreSQL based on SQLite schema using direct psycopg2"""
    try:
        # Connect to PostgreSQL
        pg_conn = psycopg2.connect(pg_conn_string)
        pg_cursor = pg_conn.cursor()
        
        # Drop table if it exists
        pg_cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
        pg_conn.commit()
        
        # Construct CREATE TABLE statement
        columns = []
        primary_keys = []
        
        for column in schema:
            col_id, col_name, col_type, not_null, default_val, is_pk = column
            
            pg_type = get_postgres_data_type(col_type)
            column_def = f'"{col_name}" {pg_type}'
            
            if not_null:
                column_def += ' NOT NULL'
                
            if default_val is not None:
                if 'AUTOINCREMENT' in str(default_val).upper():
                    # Use serial for autoincrement
                    column_def = f'"{col_name}" SERIAL'
                else:
                    column_def += f" DEFAULT {default_val}"
            
            columns.append(column_def)
            
            if is_pk:
                primary_keys.append(f'"{col_name}"')
        
        # Add primary key constraint if any
        if primary_keys:
            columns.append(f"PRIMARY KEY ({', '.join(primary_keys)})")
        
        # Execute CREATE TABLE
        create_table_sql = f"CREATE TABLE {table_name} ({', '.join(columns)});"
        pg_cursor.execute(create_table_sql)
        pg_conn.commit()
        
        # Close cursor and connection
        pg_cursor.close()
        pg_conn.close()
        
        print(f"Created table {table_name} in PostgreSQL")
        return True
    except Exception as e:
        print(f"Error creating table {table_name}: {e}")
        return False

def migrate_table_data(table_name, pg_conn_string):
    """Migrate data from SQLite to PostgreSQL for a specific table"""
    try:
        # Connect to SQLite and read data
        sqlite_conn = sqlite3.connect('./database/sds_system.db')
        df = pd.read_sql_query(f"SELECT * FROM {table_name}", sqlite_conn)
        sqlite_conn.close()
        
        if df.empty:
            print(f"Table {table_name} is empty, skipping data migration")
            return True
        
        # Replace any NaN values with None for proper PostgreSQL NULL handling
        df = df.where(pd.notnull(df), None)
        
        # Connect to PostgreSQL
        pg_conn = psycopg2.connect(pg_conn_string)
        pg_cursor = pg_conn.cursor()
        
        # Get column names
        columns = df.columns
        column_names = ", ".join([f'"{col}"' for col in columns])
        
        # Insert data row by row
        inserted = 0
        for _, row in df.iterrows():
            # Create placeholders and values list
            placeholders = ", ".join("%s" for _ in columns)
            values = [row[col] for col in columns]
            
            # Insert query
            insert_query = f'INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})'
            
            try:
                pg_cursor.execute(insert_query, values)
                inserted += 1
            except Exception as row_error:
                print(f"Error inserting row: {row_error}")
        
        # Commit transaction
        pg_conn.commit()
        
        # Close cursor and connection
        pg_cursor.close()
        pg_conn.close()
        
        print(f"Migrated {inserted} rows from {table_name} to PostgreSQL")
        return True
    except Exception as e:
        print(f"Error migrating data for table {table_name}: {e}")
        return False

def main():
    """Main migration function"""
    print("Starting database migration from SQLite to PostgreSQL...")
    start_time = time.time()
    
    # Get PostgreSQL connection string from settings
    pg_conn_string = settings.DATABASE_URL
    
    # Get list of tables from SQLite
    tables = get_sqlite_tables()
    print(f"Found {len(tables)} tables in SQLite database: {', '.join(tables)}")
    
    success_count = 0
    for table in tables:
        print(f"\nProcessing table: {table}")
        
        # Get table schema
        schema = get_sqlite_table_schema(table)
        
        # Create table in PostgreSQL
        if create_postgres_table(table, schema, pg_conn_string):
            # Migrate data
            if migrate_table_data(table, pg_conn_string):
                success_count += 1
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\nMigration completed in {duration:.2f} seconds.")
    print(f"Successfully migrated {success_count} out of {len(tables)} tables.")
    
    if success_count == len(tables):
        print("All tables migrated successfully!")
    else:
        print(f"Warning: {len(tables) - success_count} tables failed to migrate properly.")

if __name__ == "__main__":
    main()