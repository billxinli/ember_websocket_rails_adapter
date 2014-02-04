(function () {
  /**
   @module ember-data
   */

  var forEach = Ember.EnumerableUtils.forEach;
//var forEach = Ember.ArrayPolyfills.forEach;
  // Why are there two of these bloody functions?

  var decamelize = Ember.String.decamelize;
  var underscore = Ember.String.underscore;
  var pluralize = Ember.String.pluralize;

  var get = Ember.get;
  var set = Ember.set;


  DS.WSAdapter = DS.Adapter.extend({
    defaultSerializer: '-active-model',

    find: function (store, type, id) {
      return this.ajax(this.buildURL(type.typeKey, id), 'GET');
    },


    findAll: function (store, type, sinceToken) {
      var query;

      if (sinceToken) {
        query = { since: sinceToken };
      }

      return this.ajax(this.buildURL(type.typeKey), 'GET', { data: query });
    },

    findQuery: function (store, type, query) {
      return this.ajax(this.buildURL(type.typeKey), 'GET', { data: query });
    },

    findMany: function (store, type, ids) {
      return this.ajax(this.buildURL(type.typeKey), 'GET', { data: { ids: ids } });
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

      return this.ajax(this.buildURL(type.typeKey), "POST", { data: data });
    },


    updateRecord: function (store, type, record) {
      var data = {};
      var serializer = store.serializerFor(type.typeKey);

      serializer.serializeIntoHash(data, type, record);

      var id = get(record, 'id');

      return this.ajax(this.buildURL(type.typeKey, id), "PUT", { data: data });
    },


    deleteRecord: function (store, type, record) {
      var id = get(record, 'id');

      return this.ajax(this.buildURL(type.typeKey, id), "DELETE");
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


    ajaxError: function (jqXHR) {
      var error = this._super(jqXHR);

      if (jqXHR && jqXHR.status === 422) {
        var response = Ember.$.parseJSON(jqXHR.responseText),
          errors = {};

        if (response.errors !== undefined) {
          var jsonErrors = response.errors;

          forEach(Ember.keys(jsonErrors), function (key) {
            errors[Ember.String.camelize(key)] = jsonErrors[key];
          });
        }

        return new DS.InvalidError(errors);
      } else {
        return error;
      }
    },

    ajax: function (url, type, hash) {
      var adapter = this;

      return new Ember.RSVP.Promise(function (resolve, reject) {
        hash = adapter.ajaxOptions(url, type, hash);

        hash.success = function (json) {
          Ember.run(null, resolve, json);
        };

        hash.error = function (jqXHR, textStatus, errorThrown) {
          Ember.run(null, reject, adapter.ajaxError(jqXHR));
        };

        Ember.$.ajax(hash);
      }, "DS: RestAdapter#ajax " + type + " to " + url);
    },

    ajaxOptions: function (url, type, hash) {
      hash = hash || {};
      hash.url = url;
      hash.type = type;
      hash.dataType = 'json';
      hash.context = this;

      if (hash.data && type !== 'GET') {
        hash.contentType = 'application/json; charset=utf-8';
        hash.data = JSON.stringify(hash.data);
      }

      if (this.headers !== undefined) {
        var headers = this.headers;
        hash.beforeSend = function (xhr) {
          forEach.call(Ember.keys(headers), function (key) {
            xhr.setRequestHeader(key, headers[key]);
          });
        };
      }


      return hash;
    }

  });

})();
