import React, { useState, useEffect } from 'react';
import '../rdkitConfig';
import { PUBLIC_URL } from '../rdkitConfig';

/**
 * RDKitLoader - Component responsible for loading the RDKit JavaScript and WASM files
 * This component handles loading both files in the correct sequence and makes RDKit available globally
 */
const RDKitLoader = ({ onLoad, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Skip loading if RDKit is already available
    if (window.RDKitModule) {
      console.log('RDKit already loaded in window!');
      onLoad && onLoad(window.RDKitModule);
      setLoading(false);
      return;
    }

    const loadRDKit = async () => {
      try {
        console.log('Starting RDKit loading process');
        
        // Set up global config for RDKit WebAssembly module
        window.Module = window.Module || {};
        window.Module.locateFile = (file) => {
          console.log(`Locating file: ${file}`);
          // Ensure the WASM file is loaded from the correct path
          if (file.endsWith('.wasm')) {
            return `${process.env.PUBLIC_URL || ''}/rdkit/${file}`;
          }
          return file;
        };

        // Create and load the script element
        const script = document.createElement('script');
        script.src = `${PUBLIC_URL}/rdkit/RDKit_minimal.js`;
        script.async = true;
        script.id = 'rdkit-loader';
        script.crossOrigin = 'anonymous';
        
        // Handle successful load
        script.onload = () => {
          console.log('RDKit script loaded, initializing...');
          
          // Different RDKit versions initialize differently
          if (typeof window.RDKitModule === 'function') {
            console.log('RDKitModule is a function, initializing...');
            window.RDKitModule()
              .then(rdkit => {
                console.log('RDKit initialized successfully!');
                window.rdkit = rdkit; // Store for convenience
                onLoad && onLoad(rdkit);
                setLoading(false);
              })
              .catch(err => {
                console.error('Failed to initialize RDKit:', err);
                setError(`RDKit initialization failed: ${err.message}`);
                onError && onError(err);
                setLoading(false);
              });
          } else if (window.RDKitModule) {
            console.log('RDKit already available, using directly');
            onLoad && onLoad(window.RDKitModule);
            setLoading(false);
          } else {
            const msg = 'RDKit script loaded but RDKitModule not found';
            console.error(msg);
            setError(msg);
            onError && onError(new Error(msg));
            setLoading(false);
          }
        };
        
        // Handle loading errors
        script.onerror = (err) => {
          const msg = `Failed to load RDKit script: ${err}`;
          console.error(msg);
          setError(msg);
          onError && onError(new Error(msg));
          setLoading(false);
        };
        
        // Add script to document
        document.body.appendChild(script);
        console.log('RDKit script added to DOM');
      } catch (err) {
        const msg = `Exception loading RDKit: ${err.message}`;
        console.error(msg);
        setError(msg);
        onError && onError(err);
        setLoading(false);
      }
    };

    loadRDKit();
    
    // Cleanup function
    return () => {
      // We don't remove the script as RDKit should remain available globally
    };
  }, [onLoad, onError]);

  return (
    <div style={{ display: 'none' }} data-testid="rdkit-loader" data-status={loading ? 'loading' : error ? 'error' : 'loaded'}>
      {/* Hidden component - renders nothing visible */}
    </div>
  );
};

export default RDKitLoader;
