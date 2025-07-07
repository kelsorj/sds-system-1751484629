"""
API endpoints for molecule rendering and visualization
"""

import io
from typing import Optional
from fastapi import APIRouter, HTTPException, Response, Query
from rdkit import Chem
from rdkit.Chem import Draw
from rdkit.Chem.Draw import rdMolDraw2D
from PIL import Image

router = APIRouter()

@router.get("/draw_molecule", response_class=Response)
async def draw_molecule(
    smiles: str = Query(..., description="SMILES string of the molecule"),
    width: int = Query(200, description="Width of the output image"),
    height: int = Query(150, description="Height of the output image")
):
    """
    Generate a PNG image of a molecule from its SMILES string.
    Returns a PNG image binary.
    """
    try:
        # Parse the SMILES string
        mol = Chem.MolFromSmiles(smiles)
        
        if not mol:
            raise HTTPException(
                status_code=400, 
                detail=f"Could not parse SMILES string: {smiles}"
            )
        
        # Create a drawing object
        drawer = rdMolDraw2D.MolDraw2DCairo(width, height)
        
        # Set drawing options
        opts = drawer.drawOptions()
        opts.addStereoAnnotation = True
        opts.additionalAtomLabelPadding = 0.15
        
        # Draw the molecule
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        
        # Get the PNG data
        png_data = drawer.GetDrawingText()
        
        # Convert to PIL Image for potential post-processing
        img = Image.open(io.BytesIO(png_data))
        
        # Convert back to PNG bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Return the image with appropriate headers
        return Response(
            content=img_byte_arr.getvalue(), 
            media_type="image/png"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to draw molecule: {str(e)}"
        )
