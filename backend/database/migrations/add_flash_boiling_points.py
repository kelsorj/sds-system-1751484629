"""
Migration script to add flash_point_f and boiling_point_f columns to chemicals table
"""
from sqlalchemy import Column, Float
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add flash_point_f column
    op.add_column(
        'chemicals',
        Column('flash_point_f', Float, nullable=True, comment='Flash point in Fahrenheit')
    )
    
    # Add boiling_point_f column
    op.add_column(
        'chemicals',
        Column('boiling_point_f', Float, nullable=True, comment='Boiling point in Fahrenheit')
    )

def downgrade():
    # Drop the columns if we need to rollback
    op.drop_column('chemicals', 'flash_point_f')
    op.drop_column('chemicals', 'boiling_point_f')
