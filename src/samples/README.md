# Sample OID-See Graph Files

This directory contains sample OID-See export JSON files for testing and demonstration purposes.

## Files

### `sample-oidsee-graph.json`
- **Size:** ~987KB
- **Nodes:** 238
- **Edges:** 32
- **Purpose:** Standard sample for normal operation testing
- **Features:** Demonstrates typical tenant structure with service principals, applications, users, groups, and roles

### `sample-large-oidsee-graph.json`
- **Size:** ~3.2MB
- **Nodes:** 12,000
- **Edges:** 18,000
- **Purpose:** Large dataset for performance testing
- **Features:** 
  - Tests large graph handling (exceeds 10,000 node/edge threshold)
  - Triggers automatic physics optimization
  - Demonstrates browser responsiveness with large datasets
  - Contains varied node types and risk levels

## Usage

### In the Viewer
1. Open the OID-See viewer
2. Click "Upload JSON"
3. Select one of these sample files
4. For the large sample, you'll see:
   - Loading overlay during processing
   - Info dialog explaining physics optimization
   - Graph renders without browser freezing

### For Testing
- **Small Graph Behavior:** Use `sample-oidsee-graph.json` to test normal physics-enabled rendering
- **Large Graph Behavior:** Use `sample-large-oidsee-graph.json` to test performance optimizations

## Generating Custom Samples

To generate additional test data, see the Python scripts in the repository's test utilities.
