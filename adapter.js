(function () {
  /**
   @module ember-data
   */
  // Why are there two of these bloody functions?
  var forEach = Ember.ArrayPolyfills.forEach;
  forEach = Ember.EnumerableUtils.forEach;

  var decamelize = Ember.String.decamelize;
  var underscore = Ember.String.underscore;
  var pluralize = Ember.String.pluralize;

  var get = Ember.get;
  var set = Ember.set;


  DS.WSAdapter = DS.Adapter.extend({
    defaultSerializer: '-active-model',

    dispatcher: null,

    init: function () {
      Ember.assert('You must provide a host for DS.WSAdapter', this.host != null);
      var dispatcher = new WebSocketRails(this.host);
      this.set('dispatcher', dispatcher);
      this._super();
    },

    websocket: function (event, data) {
      var _this = this;

      return new Ember.RSVP.Promise(function (resolve, reject) {

        _this.dispatcher.trigger(event, data,
          function (response) {
            Ember.run(null, resolve, response.payload);
          },
          function (response) {
            Ember.run(null, reject, response);
          });
      }, "DS: RestAdapter#websocket " + event + " to " + this.host);
    },

    find: function (store, type, id) {
      var event = type.typeKey + '.show';

      var data = {type: 'show', id: id};

      return this.websocket(event, data);
    },

    findAll: function (store, type, sinceToken) {
      var query;

      if (sinceToken) {
        query = { since: sinceToken };
      }

      var event = type.typeKey + '.index';
      var data = {type: 'find_all', query: query};
      return this.websocket(event, data);
    },

    findQuery: function (store, type, query) {
      var event = type.typeKey + '.index';
      var data = {type: 'find_query', query: query};
      return this.websocket(event, data);
    },


    findMany: function (store, type, ids) {
      var event = type.typeKey + '.index';

      var data = {type: 'find_many', ids: ids};

      return this.websocket(event, data);
    },

    findHasMany: function (store, record, url) {
      var host = get(this, 'host'),
        id = get(record, 'id'),
        type = record.constructor.typeKey;

      if (host && url.charAt(0) === '/' && url.charAt(1) !== '/') {
        url = host + url;
      }

      return this.ajax(this.urlPrefix(url, this.buildURL(type, id)), 'GET');
    },


    findBelongsTo: function (store, record, url) {
      var id = get(record, 'id'),
        type = record.constructor.typeKey;

      return this.ajax(this.urlPrefix(url, this.buildURL(type, id)), 'GET');
    },


    createRecord: function (store, type, record) {
      var data = {};
      var serializer = store.serializerFor(type.typeKey);

      serializer.serializeIntoHash(data, type, record, { includeId: true });

      var event = type.typeKey + '.create';

      var data = {type: 'create', data: data};

      return this.websocket(event, data);
    },


    updateRecord: function (store, type, record) {
      var data = {};
      var serializer = store.serializerFor(type.typeKey);

      serializer.serializeIntoHash(data, type, record);

      var id = get(record, 'id');

      var event = type.typeKey + '.update';

      var data = $.extend({}, {type: 'update', id: id}, data);

      return this.websocket(event, data);
    },


    deleteRecord: function (store, type, record) {
      var id = get(record, 'id');

      var event = type.typeKey + '.destroy';

      var data = {type: 'destroy', id: id};

      return this.websocket(event, data);
    },

    buildURL: function (type, id) {
      var url = [],
        host = get(this, 'host'),
        prefix = this.urlPrefix();

      if (type) {
        url.push(this.pathForType(type));
      }
      if (id) {
        url.push(id);
      }

      if (prefix) {
        url.unshift(prefix);
      }

      url = url.join('/');
      if (!host && url) {
        url = '/' + url;
      }

      return url;
    },


    urlPrefix: function (path, parentURL) {
      var host = get(this, 'host'),
        namespace = get(this, 'namespace'),
        url = [];

      if (path) {
        // Absolute path
        if (path.charAt(0) === '/') {
          if (host) {
            path = path.slice(1);
            url.push(host);
          }
          // Relative path
        } else if (!/^http(s)?:\/\//.test(path)) {
          url.push(parentURL);
        }
      } else {
        if (host) {
          url.push(host);
        }
        if (namespace) {
          url.push(namespace);
        }
      }

      if (path) {
        url.push(path);
      }

      return url.join('/');
    },


    pathForType: function (type) {
      var decamelized = decamelize(type);
      var underscored = underscore(decamelized);
      return pluralize(underscored);
    },

    ajax: function (url, type, hash) {
      console.log('Need to reimplement this with websocket()');
    }

  });

})();
