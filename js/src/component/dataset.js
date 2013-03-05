/**
 * DataSet
 *
 * Usage:
 *     var dataSet = new DataSet({
 *         id: '_id',
 *         fieldTypes: {
 *             // ...
 *         }
 *     });
 *
 *     dataSet.add(item);
 *     dataSet.add(data);
 *     dataSet.update(item);
 *     dataSet.update(data);
 *     dataSet.remove(id);
 *     dataSet.remove(ids);
 *     var data = dataSet.get();
 *     var data = dataSet.get(id);
 *     var data = dataSet.get(ids);
 *     var data = dataSet.get(ids, options, data);
 *     dataSet.clear();
 *
 * A data set can:
 * - add/remove/update data
 * - gives triggers upon changes in the data
 * - can  import/export data in various data formats
 * @param {Object} [options]   Available options:
 *                             {String} id      Field name of the id in the
 *                                              items, 'id' by default.
 *                             {Object.<String, String} fieldTypes
 *                                              A map with field names as key,
 *                                              and the field type as value.
 */
function DataSet (options) {
    var me = this;

    this.options = options || {};
    this.data = {};                         // map with data indexed by id
    this.idField = this.options.id || 'id'; // field name of the id
    this.fieldTypes = {};                   // field types by field name
    if (options.fieldTypes) {
        each(options.fieldTypes, function (value, field) {
            if (value == 'Date' || value == 'ISODate' || value == 'ASPDate') {
                me.fieldTypes[field] = 'Date';
            }
            else {
                me.fieldTypes[field] = value;
            }
        });
    }

    this.internalIds = {};            // internally generated id's
}

// TODO: implement triggers

/**
 * Add data. Existing items with the same id will be overwritten.
 * @param {Object | Array | DataTable} data
 */
DataSet.prototype.add = function (data) {
    var me = this;
    if (data instanceof Array) {
        // Array
        data.forEach(function (item) {
            me._setItem(item);
        });
    }
    else if (isDataTable(data)) {
        // Google DataTable
        var columns = this._getColumnNames(data);
        for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
            var item = {};
            columns.forEach(function (field, col) {
                item[field] = data.getValue(row, col);
            });
            me._setItem(item);
        }
    }
    else if (data instanceof Object) {
        // Single item
        me._setItem(data);
    }
    else {
        throw new Error('Unknown dataType');
    }
};

/**
 * Update existing items. Items with the same id will be merged
 * @param {Object | Array | DataTable} data
 */
DataSet.prototype.update = function (data) {
    var me = this;
    if (data instanceof Array) {
        // Array
        data.forEach(function (item) {
            me._updateItem(item);
        });
    }
    else if (isDataTable(data)) {
        // Google DataTable
        var columns = this._getColumnNames(data);
        for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
            var item = {};
            columns.forEach(function (field, col) {
                item[field] = data.getValue(row, col);
            });
            me._updateItem(item);
        }
    }
    else if (data instanceof Object) {
        // Single item
        me._updateItem(data);
    }
    else {
        throw new Error('Unknown dataType');
    }
};

/**
 * Get a data item or multiple items
 * @param {String | Number | Array} [ids]   Id of a single item, or an array
 *                                          with multiple id's, or undefined to
 *                                          retrieve all data.
 * @param {Object} [options]                Available options:
 *                                          {String} [type]
 *                                          'DataTable' or 'Array' (default)
 *                                          {Object.<String, String>} [fieldTypes]
 *                                          {String[]} [fields]  filter fields
 * @param {Array | DataTable} [data]        If provided, items will be appended
 *                                          to this array or table. Required
 *                                          in case of Google DataTable
 * @return {Array | Object | DataTable | undefined} data
 * @throws Error
 */
DataSet.prototype.get = function (ids, options, data) {
    var me = this;

    // merge field types
    var fieldTypes = {};
    if (this.options && this.options.fieldTypes) {
        each(this.options.fieldTypes, function (value, field) {
            fieldTypes[field] = value;
        });
    }
    if (options && options.fieldTypes) {
        each(options.fieldTypes, function (value, field) {
            fieldTypes[field] = value;
        });
    }

    var fields = options ? options.fields : undefined;
    data = data || [];

    // determine the return type
    var type;
    if (options && options.type) {
        type = (options.type == 'DataTable') ? 'DataTable' : 'Array';

        if (data && (type != getType(data))) {
            throw new Error('Type of parameter "data" does (' + getType(data) + ') ' +
                'does not correspond with specified options.type (' + options.type + ')');
        }
        if (type == 'DataTable' && !isDataTable(data)) {
            throw new Error('Parameter "data" must be a DataTable ' +
                'when options.type is "DataTable"');
        }
    }
    else if (data) {
        type = (getType(data) == 'DataTable') ? 'DataTable' : 'Array';
    }
    else {
        type = 'Array';
    }

    if (type == 'DataTable') {
        // return a Google DataTable
        var columns = this._getColumnNames(data);
        if (ids == undefined) {
            // return all data
            each(this.data, function (item) {
                me._appendRow(data, columns, me._castItem(item));
            });
        }
        else if (isNumber(ids) || isString(ids)) {
            var item = me._castItem(this.data[ids], fieldTypes, fields);
            this._appendRow(data, columns, item);
        }
        else if (ids instanceof Array) {
            ids.forEach(function (id) {
                var item = me._castItem(me.data[id], fieldTypes, fields);
                me._appendRow(data, columns, item);
            });
        }
        else {
            throw new TypeError('Parameter "ids" must be ' +
                'undefined, a String, Number, or Array');
        }
    }
    else {
        // return an array
        if (ids == undefined) {
            // return all data
            each(this.data, function (item) {
                data.push(me._castItem(item, fieldTypes, fields));
            });
        }
        else if (isNumber(ids) || isString(ids)) {
            // return a single item
            return this._castItem(ids, fieldTypes, fields);
        }
        else if (ids instanceof Array) {
            ids.forEach(function (id) {
                data.push(me._castItem(me.data[id], fieldTypes, fields));
            });
        }
        else {
            throw new TypeError('Parameter "ids" must be ' +
                'undefined, a String, Number, or Array');
        }
    }

    return data;
};

/**
 * Remove an object by pointer or by id
 * @param {String | Number | Object | Array} id   Object or id, or an array with
 *                                                objects or ids to be removed
 */
DataSet.prototype.remove = function (id) {
    var me = this;

    if (isNumber(id) || isString(id)) {
        delete this.data[id];
        delete this.internalIds[id];
    }
    else if (id instanceof Array) {
        id.forEach(function (id) {
            me.remove(id);
        });
    }
    else if (id instanceof Object) {
        // search for the object
        for (var i in this.data) {
            if (this.data.hasOwnProperty(i)) {
                if (this.data[i] == id) {
                    delete this.data[i];
                    delete this.internalIds[i];
                }
            }
        }
    }
};

/**
 * Clear the data
 */
DataSet.prototype.clear = function () {
    this.data = [];
    this.internalIds = {};
};

/**
 * Set a single item
 * @param {Object} item
 * @private
 */
DataSet.prototype._setItem = function (item) {
    var id = item[this.idField];
    if (id == undefined) {
        // generate an id
        id = randomUUID();
        item[this.idField] = id;

        this.internalIds[id] = item;
    }

    var d = {};
    for (var field in item) {
        if (item.hasOwnProperty(field)) {
            var type = this.fieldTypes[field];  // type may be undefined
            d[field] = cast(item[field], type);
        }
    }
    this.data[id] = d;
};

/**
 * Cast and filter the fields of an item
 * @param {Object | undefined} item
 * @param {Object.<String, String>} [fieldTypes]
 * @param {String[]} [fields]
 * @return {Object | undefined} castedItem
 * @private
 */
DataSet.prototype._castItem = function (item, fieldTypes, fields) {
    var clone = undefined;
    if (item) {
        fieldTypes = fieldTypes || {};

        clone = {};
        for (var field in item) {
            if (item.hasOwnProperty(field)) {
                if (!fields || (fields.indexOf(field) != -1)) {
                    clone[field] = cast(item[field], fieldTypes[field]);
                }
            }
        }

        // do not output internally generated id's
        if (item[this.idField] in this.internalIds) {
            delete clone[this.idField];
        }
    }

    return clone;
};

/**
 * Update a single item: merge with existing item
 * @param {Object} item
 * @private
 */
DataSet.prototype._updateItem = function (item) {
    var id = item[this.idField];
    if (id == undefined) {
        throw new Error('Item has no id item: ' + JSON.stringify(item));
    }
    var d = this.data[id];
    if (d) {
        // merge with current item
        for (var field in item) {
            if (item.hasOwnProperty(field)) {
                var type = this.fieldTypes[field];  // type may be undefined
                d[field] = cast(item[field], type);
            }
        }
    }
    else {
        // create new item
        this._setItem(item);
    }
};

/**
 * Get an array with the column names of a Google DataTable
 * @param {DataTable} dataTable
 * @return {Array} columnNames
 * @private
 */
DataSet.prototype._getColumnNames = function (dataTable) {
    var columns = [];
    for (var col = 0, cols = dataTable.getNumberOfColumns(); col < cols; col++) {
        columns[col] = dataTable.getColumnId(col) || dataTable.getColumnLabel(col);
    }
    return columns;
};

/**
 * Append an item as a row to the dataTable
 * @param dataTable
 * @param columns
 * @param item
 * @private
 */
DataSet.prototype._appendRow = function (dataTable, columns, item) {
    var row = dataTable.addRow();
    columns.forEach(function (field, col) {
        dataTable.setValue(row, col, item[field]);
    });
};