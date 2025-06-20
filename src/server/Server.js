import {utils} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

/**
 * Default server client which loads content for a {@link BIMViewer} via HTTP from the file system.
 *
 * A BIMViewer is instantiated with an instance of this class.
 *
 * To load content from an alternative source, instantiate BIMViewer with your own custom implementation of this class.
 */
class Server {

    /**
     * Constructs a Server.
     *
     * @param {*} [cfg] Server configuration.
     * @param {String} [cfg.dataDir] Base directory for content.
     */
    constructor(cfg = {}) {
        this._dataDir = cfg.dataDir || "";
    }

    /**
     * Gets information on all available projects.
     *
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getProjects(done, error) {
        const url = this._dataDir + "/projects/index.json";
        utils.loadJSON(url, done, error);
    }

    /**
     * Gets information for a project.
     *
     * @param {String} projectId ID of the project.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getProject(projectId, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/index.json";
        utils.loadJSON(url, done, error);
    }

    /**
     * Gets metadata for a model within a project.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getMetadata(projectId, modelId, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/metadata.json";
        utils.loadJSON(url, done, error);
    }

    /**
     * Gets geometry for a model within a project.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getGeometry(projectId, modelId, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/geometry.xkt";
        utils.loadArraybuffer(url, done, error);
    }

    /**
     * Gets metadata for an object within a model within a project.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     * @param {String} objectId ID of the object.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getObjectInfo(projectId, modelId, objectId, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/props/" + objectId + ".json";
        utils.loadJSON(url, done, error);
    }

    /**
     * Gets existing issues for a model within a project.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getIssues(projectId, modelId, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/issues.json";
        utils.loadJSON(url, done, error);
    }


    /**
     * Gets a JSON manifest file for a model that's split into multiple XKT files (and maybe also JSON metadata files).
     *
     * The manifest can have an arbitrary name, and will list all the XKT (and maybe separate JSON metada files)
     * that comprise the model.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     * @param {String} manifestName Filename of the manifest.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getSplitModelManifest(projectId, modelId, manifestName, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/" + manifestName;
        utils.loadJSON(url, done, error);
    }

    /**
     * Gets one of the metadata files within a split model within a project.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     * @param {String} metadataFileName Filename of the metadata file.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getSplitModelMetadata(projectId, modelId, metadataFileName, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/" + metadataFileName;
        utils.loadJSON(url, done, error);
    }

    /**
     * Gets one of the XKT geometry files within a split model within a project.
     *
     * @param {String} projectId ID of the project.
     * @param {String} modelId ID of the model.
     *  @param {String} geometryFileName Filename of the XKT geometry file.
     * @param {Function} done Callback through which the JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getSplitModelGeometry(projectId, modelId, geometryFileName, done, error) {
        const url = this._dataDir + "/projects/" + projectId + "/models/" + modelId + "/" + geometryFileName;
        utils.loadArraybuffer(url, done, error);
    }

    /**
     * Gets OData service metadata document for elements and properties.
     *
     * @param {Function} done Callback through which the XML metadata document is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getODataMetadata(done, error) {
        const metadata = `<?xml version="1.0" encoding="UTF-8"?>
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
        
        if (done) {
            done(metadata);
        }
    }

    /**
     * Gets elements and their properties for a project in OData format.
     *
     * @param {String} projectId ID of the project.
     * @param {Object} [options] Query options.
     * @param {String} [options.$filter] OData filter expression.
     * @param {String} [options.$select] OData select expression.
     * @param {Number} [options.$top] Maximum number of results to return.
     * @param {Number} [options.$skip] Number of results to skip.
     * @param {Function} done Callback through which the OData JSON result is returned.
     * @param {Function} error Callback through which an error message is returned on error.
     */
    getODataElements(projectId, options = {}, done, error) {
        // Get project info first
        this.getProject(projectId, (projectData) => {
            if (!projectData || !projectData.models) {
                if (error) {
                    error("Project not found or has no models");
                }
                return;
            }

            const elements = [];
            let modelsProcessed = 0;
            const totalModels = projectData.models.length;

            if (totalModels === 0) {
                this._returnODataResponse(elements, options, done);
                return;
            }

            // Process each model in the project
            projectData.models.forEach((model) => {
                this.getMetadata(projectId, model.id, (metadata) => {
                    if (metadata && metadata.metaObjects) {
                        metadata.metaObjects.forEach((metaObject) => {
                            const element = {
                                id: metaObject.id,
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
                        this._returnODataResponse(elements, options, done);
                    }
                }, (err) => {
                    modelsProcessed++;
                    if (modelsProcessed === totalModels) {
                        this._returnODataResponse(elements, options, done);
                    }
                });
            });
        }, error);
    }

    /**
     * Private helper method to format and return OData response with query options applied.
     *
     * @private
     * @param {Array} elements Array of element objects.
     * @param {Object} options Query options.
     * @param {Function} done Callback to return the formatted response.
     */
    _returnODataResponse(elements, options, done) {
        let filteredElements = elements;

        // Apply OData $filter
        if (options.$filter) {
            filteredElements = this._applyODataFilter(filteredElements, options.$filter);
        }

        // Apply OData $select
        if (options.$select) {
            const selectFields = options.$select.split(',').map(f => f.trim());
            filteredElements = filteredElements.map(element => {
                const selectedElement = {};
                selectFields.forEach(field => {
                    if (element.hasOwnProperty(field)) {
                        selectedElement[field] = element[field];
                    }
                });
                return selectedElement;
            });
        }

        // Apply OData $skip and $top
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

        if (done) {
            done(response);
        }
    }

    /**
     * Private helper method to apply OData filter expressions.
     *
     * @private
     * @param {Array} elements Array of element objects.
     * @param {String} filterExpression OData filter expression.
     * @returns {Array} Filtered array of elements.
     */
    _applyODataFilter(elements, filterExpression) {
        // Basic implementation of common OData filter operations
        // This supports simple equality and contains operations
        
        try {
            // Handle 'eq' (equals) operations
            if (filterExpression.includes(' eq ')) {
                const [field, value] = filterExpression.split(' eq ').map(s => s.trim());
                const cleanValue = value.replace(/'/g, ''); // Remove quotes
                return elements.filter(element => element[field] === cleanValue);
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

            // If filter expression is not supported, return all elements
            return elements;
        } catch (e) {
            // If there's an error parsing the filter, return all elements
            return elements;
        }
    }
}

export {Server};