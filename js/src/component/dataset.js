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
 *     dataSet.put(item);
 *     dataSet.put(data);
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

    // event subscribers
    this.subscribers = {};

    this.internalIds = {};            // internally generated id's
}

/**
 * Subscribe to an event, add an event listener
 * @param {String} event        Event name. Available events: 'put', 'update',
 *                              'remove'
 * @param {function} callback   Callback method. Called with three parameters:
 *                                  {String} event
 *                                  {Object | null} params
 *                                  {String} senderId
 * @param {String} [id]         Optional id for the sender, used to filter
 *                              events triggered by the sender itself.
 */
DataSet.prototype.subscribe = function (event, callback, id) {
    var subscribers = this.subscribers[event];
    if (!subscribers) {
        subscribers = [];
        this.subscribers[event] = subscribers;
    }

    subscribers.push({
        id: id ? String(id) : null,
        callback: callback
    });
};

/**
 * Unsubscribe from an event, remove an event listener
 * @param {String} event
 * @param {function} callback
 */
DataSet.prototype.unsubscribe = function (event, callback) {
    var subscribers = this.subscribers[event];
    if (subscribers) {
        this.subscribers[event] = subscribers.filter(function (listener) {
            return (listener.callback != callback);
        });
    }
};

/**
 * Trigger an event
 * @param {String} event
 * @param {Object | null} params
 * @param {String} [senderId]       Optional id of the sender. The event will
 *                                  be triggered for all subscribers except the
 *                                  sender itself.
 * @private
 */
DataSet.prototype._trigger = function (event, params, senderId) {
    if (event == '*') {
        throw new Error('Cannot trigger event *');
    }

    var subscribers = [];
    if (event in this.subscribers) {
        subscribers = subscribers.concat(this.subscribers[event]);
    }
    if ('*' in this.subscribers) {
        subscribers = subscribers.concat(this.subscribers['*']);
    }

    subscribers.forEach(function (listener) {
        if (listener.id != senderId && listener.callback) {
            listener.callback(event, params, senderId || null);
        }
    });
};

/**
 * Add data. Existing items with the same id will be overwritten.
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id, used to trigger events for
 *                            all but this sender's event subscribers.
 */
DataSet.prototype.put = function (data, senderId) {
    var items = [],
        id,
        me = this;

    if (data instanceof Array) {
        // Array
        data.forEach(function (item) {
            var id = me._setItem(item);
            items.push(id);
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
            id = me._setItem(item);
            items.push(id);
        }
    }
    else if (data instanceof Object) {
        // Single item
        id = me._setItem(data);
        items.push(id);
    }
    else {
        throw new Error('Unknown dataType');
    }

    this._trigger('put', {items: items}, senderId);
};

/**
 * Update existing items. Items with the same id will be merged
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id, used to trigger events for
 *                            all but this sender's event subscribers.
 */
DataSet.prototype.update = function (data, senderId) {
    var items = [],
        id,
        me = this;

    if (data instanceof Array) {
        // Array
        data.forEach(function (item) {
            var id = me._updateItem(item);
            items.push(id);
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
            id = me._updateItem(item);
            items.push(id);
        }
    }
    else if (data instanceof Object) {
        // Single item
        id = me._updateItem(data);
        items.push(id);
    }
    else {
        throw new Error('Unknown dataType');
    }

    this._trigger('update', {items: items}, senderId);
};

/**
 * Get a data item or multiple items
 * @param {String | Number | Array} [ids]   Id of a single item, or an array
 *                                          with multiple id's, or undefined to
 *                                          retrieve all data.
 * @param {Object} [options]                Available options:
 *                                          {String} [type]
 *                                              'DataTable' or 'Array' (default)
 *                                          {Object.<String, String>} [fieldTypes]
 *                                          {String[]} [fields]  filter fields
 * @param {Array | DataTable} [data]        If provided, items will be appended
 *                                          to this array or table. Required
 *                                          in case of Google DataTable
 * @return {Array | Object | DataTable | null} data
 * @throws Error
 */
DataSet.prototype.get = function (ids, options, data) {
    var me = this;

    // shift arguments when first argument contains the options
    if (getType(ids) == 'Object') {
        data = options;
        options = ids;
        ids = undefined;
    }

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

    // determine the return type
    var type;
    if (options && options.type) {
        type = (options.type == 'DataTable') ? 'DataTable' : 'Array';

        if (data && (type != getType(data))) {
            throw new Error('Type of parameter "data" (' + getType(data) + ') ' +
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
            var item = me._castItem(me.data[ids], fieldTypes, fields);
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
        data = data || [];
        if (ids == undefined) {
            // return all data
            each(this.data, function (item) {
                data.push(me._castItem(item, fieldTypes, fields));
            });
        }
        else if (isNumber(ids) || isString(ids)) {
            // return a single item
            return this._castItem(me.data[ids], fieldTypes, fields);
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
 * @param {String} [senderId] Optional sender id, used to trigger events for
 *                            all but this sender's event subscribers.
 */
DataSet.prototype.remove = function (id, senderId) {
    var items = [],
        me = this;

    if (isNumber(id) || isString(id)) {
        delete this.data[id];
        delete this.internalIds[id];
        items.push(id);
    }
    else if (id instanceof Array) {
        id.forEach(function (id) {
            me.remove(id);
        });
        items = items.concat(id);
    }
    else if (id instanceof Object) {
        // search for the object
        for (var i in this.data) {
            if (this.data.hasOwnProperty(i)) {
                if (this.data[i] == id) {
                    delete this.data[i];
                    delete this.internalIds[i];
                    items.push(i);
                }
            }
        }
    }

    this._trigger('remove', {items: items}, senderId);
};

/**
 * Clear the data
 * @param {String} [senderId] Optional sender id, used to trigger events for
 *                            all but this sender's event subscribers.
 */
DataSet.prototype.clear = function (senderId) {
    var items = Object.keys(this.data);

    this.data = [];
    this.internalIds = {};

    this._trigger('remove', {items: items}, senderId);
};

/**
 * Set a single item
 * @param {Object} item
 * @return {String} id
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

    return id;
};

/**
 * Cast and filter the fields of an item
 * @param {Object | undefined} item
 * @param {Object.<String, String>} [fieldTypes]
 * @param {String[]} [fields]
 * @return {Object | null} castedItem
 * @private
 */
DataSet.prototype._castItem = function (item, fieldTypes, fields) {
    var clone = null;
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
 * @return {String} id
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

    return id;
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
