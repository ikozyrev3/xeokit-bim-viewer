#!/usr/bin/env node

/**
 * Simple HTTP server that serves static files and OData endpoints for xeokit-bim-viewer
 * 
 * This server extends basic static file serving with OData endpoint support
 * to make the OData functionality accessible via HTTP.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import url from 'url';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Simple OData metadata implementation
 */
function getODataMetadata() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="XeokitBIM">
      <EntityType Name="Element">
        <Key>
          <PropertyRef Name="id"/>
        </Key>
        <Property Name="id" Type="Edm.String" Nullable="false"/>
        <Property Name="projectId" Type="Edm.String" Nullable="false"/>
        <Property Name="modelId" Type="Edm.String" Nullable="true"/>
        <Property Name="name" Type="Edm.String" Nullable="true"/>
        <Property Name="type" Type="Edm.String" Nullable="true"/>
        <Property Name="parent" Type="Edm.String" Nullable="true"/>
        <Property Name="attributes" Type="Edm.String" Nullable="true"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Elements" EntityType="XeokitBIM.Element"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * Load project data
 */
function loadProject(projectId, callback) {
    const projectPath = path.join('./app/data/projects', projectId, 'index.json');
    fs.readFile(projectPath, 'utf8', (err, data) => {
        if (err) {
            callback(null, err);
            return;
        }
        try {
            const projectData = JSON.parse(data);
            callback(projectData);
        } catch (parseErr) {
            callback(null, parseErr);
        }
    });
}

/**
 * Load model metadata
 */
function loadModelMetadata(projectId, modelId, callback) {
    const metadataPath = path.join('./app/data/projects', projectId, 'models', modelId, 'metadata.json');
    fs.readFile(metadataPath, 'utf8', (err, data) => {
        if (err) {
            callback(null, err);
            return;
        }
        try {
            const metadata = JSON.parse(data);
            callback(metadata);
        } catch (parseErr) {
            callback(null, parseErr);
        }
    });
}

/**
 * Get OData elements for a project
 */
function getODataElements(projectId, options, callback) {
    loadProject(projectId, (projectData, error) => {
        if (error || !projectData) {
            callback(null, error || 'Project not found');
            return;
        }

        if (!projectData.models || projectData.models.length === 0) {
            callback({
                "@odata.context": "$metadata#Elements",
                "@odata.count": 0,
                "value": []
            });
            return;
        }

        const elements = [];
        let modelsProcessed = 0;
        const totalModels = projectData.models.length;

        projectData.models.forEach(model => {
            loadModelMetadata(projectId, model.id, (metadata, error) => {
                if (!error && metadata && metadata.metaObjects) {
                    Object.keys(metadata.metaObjects).forEach(objectId => {
                        const metaObject = metadata.metaObjects[objectId];
                        const element = {
                            id: objectId,
                            projectId: projectId,
                            modelId: model.id,
                            name: metaObject.name || null,
                            type: metaObject.type || null,
                            parent: metaObject.parent || null,
                            attributes: metaObject.attributes ? JSON.stringify(metaObject.attributes) : null
                        };
                        elements.push(element);
                    });
                }

                modelsProcessed++;
                if (modelsProcessed === totalModels) {
                    // Apply filters and return response
                    let filteredElements = elements;
                    
                    // Apply OData filter
                    if (options.$filter) {
                        filteredElements = applyODataFilter(filteredElements, options.$filter);
                    }

                    // Apply select
                    if (options.$select) {
                        const selectFields = options.$select.split(',').map(f => f.trim());
                        filteredElements = filteredElements.map(element => {
                            const selected = {};
                            selectFields.forEach(field => {
                                if (element.hasOwnProperty(field)) {
                                    selected[field] = element[field];
                                }
                            });
                            return selected;
                        });
                    }

                    // Apply pagination
                    const skip = parseInt(options.$skip) || 0;
                    const top = parseInt(options.$top);

                    if (skip > 0) {
                        filteredElements = filteredElements.slice(skip);
                    }

                    if (top && top > 0) {
                        filteredElements = filteredElements.slice(0, top);
                    }

                    const response = {
                        "@odata.context": "$metadata#Elements",
                        "@odata.count": elements.length,
                        "value": filteredElements
                    };

                    callback(response);
                }
            });
        });
    });
}

/**
 * Apply OData filter expressions
 */
function applyODataFilter(elements, filterExpression) {
    if (!filterExpression) return elements;

    // Handle simple equality operations
    const eqMatch = filterExpression.match(/(\w+)\s+eq\s+'([^']+)'/);
    if (eqMatch) {
        const [, field, value] = eqMatch;
        return elements.filter(element => element[field] === value);
    }

    // Handle 'contains' operations
    if (filterExpression.includes('contains(')) {
        const containsMatch = filterExpression.match(/contains\((\w+),\s*'([^']+)'\)/);
        if (containsMatch) {
            const [, field, searchValue] = containsMatch;
            return elements.filter(element => 
                element[field] && element[field].toLowerCase().includes(searchValue.toLowerCase())
            );
        }
    }

    // Handle 'startswith' operations
    if (filterExpression.includes('startswith(')) {
        const startswithMatch = filterExpression.match(/startswith\((\w+),\s*'([^']+)'\)/);
        if (startswithMatch) {
            const [, field, searchValue] = startswithMatch;
            return elements.filter(element => 
                element[field] && element[field].toLowerCase().startsWith(searchValue.toLowerCase())
            );
        }
    }

    // If no recognized filter pattern, return all elements
    return elements;
}

// MIME types for static file serving
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

/**
 * Serve static files
 */
function serveStaticFile(filePath, res) {
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

/**
 * Handle OData service document endpoint
 */
function handleODataServiceDocument(res) {
    const serviceDocument = {
        "@odata.context": "$metadata",
        "@odata.serviceRoot": "/odata/",
        "value": [
            {
                "name": "Elements",
                "kind": "EntitySet",
                "url": "Elements"
            }
        ]
    };

    res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(serviceDocument, null, 2));
}

/**
 * Handle OData metadata endpoint
 */
function handleODataMetadata(res) {
    const metadata = getODataMetadata();
    res.writeHead(200, { 
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(metadata);
}

/**
 * Handle OData Elements endpoint
 */
function handleODataElements(req, res) {
    const urlParts = url.parse(req.url, true);
    const query = urlParts.query;
    
    // Extract projectId from filter or use default
    let projectId = 'WestRiversideHospital'; // Default project
    
    if (query.$filter && query.$filter.includes('projectId eq')) {
        const match = query.$filter.match(/projectId eq '([^']+)'/);
        if (match) {
            projectId = match[1];
        }
    }

    // Prepare options for OData query
    const options = {};
    if (query.$filter) options.$filter = query.$filter;
    if (query.$select) options.$select = query.$select;
    if (query.$top) options.$top = parseInt(query.$top);
    if (query.$skip) options.$skip = parseInt(query.$skip);

    getODataElements(projectId, options, (response, error) => {
        if (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error }));
        } else {
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(response, null, 2));
        }
    });
}

/**
 * Main request handler
 */
function requestHandler(req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Handle OData endpoints
    if (pathname === '/odata/' || pathname === '/odata') {
        return handleODataServiceDocument(res);
    }
    
    if (pathname === '/odata/$metadata') {
        return handleODataMetadata(res);
    }
    
    if (pathname === '/odata/Elements') {
        return handleODataElements(req, res);
    }

    // Handle static files
    let filePath = '.' + pathname;
    
    // Default to index.html for directory requests
    if (pathname === '/') {
        filePath = './index.html';
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        // Try with .html extension
        if (!filePath.includes('.')) {
            filePath += '.html';
        }
        
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
    }

    // Check if it's a directory
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
            filePath = indexPath;
        } else {
            // Generate directory listing
            fs.readdir(filePath, (err, files) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Server error');
                    return;
                }

                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head><title>Directory listing for ${pathname}</title></head>
                    <body>
                        <h1>Directory listing for ${pathname}</h1>
                        <ul>
                            <li><a href="../">../</a></li>
                            ${files.map(file => `<li><a href="${path.join(pathname, file)}">${file}</a></li>`).join('')}
                        </ul>
                    </body>
                    </html>
                `;
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            });
            return;
        }
    }

    serveStaticFile(filePath, res);
}

// Create and start server
const server = http.createServer(requestHandler);

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
    console.log('');
    console.log('OData endpoints available:');
    console.log(`  Service Document: http://${HOST}:${PORT}/odata/`);
    console.log(`  Metadata: http://${HOST}:${PORT}/odata/$metadata`);
    console.log(`  Elements: http://${HOST}:${PORT}/odata/Elements`);
    console.log('');
    console.log('Hit CTRL-C to stop the server');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});