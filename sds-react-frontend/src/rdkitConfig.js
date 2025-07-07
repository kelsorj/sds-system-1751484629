// Configuration for RDKit WebAssembly loading
// This file ensures the WebAssembly files are properly loaded from the correct path

// Set up the public URL path for RDKit files
export const PUBLIC_URL = 'http://ekmbalps1.corp.eikontx.com:6442';

// Configure global window.Module for WebAssembly loading
if (typeof window !== 'undefined') {
  window.Module = window.Module || {};
  window.Module.locateFile = (file) => {
    console.log('RDKit locating file:', file);
    if (file.endsWith('.wasm')) {
      return `${PUBLIC_URL}/rdkit/${file}`;
    }
    return file;
  };
}
