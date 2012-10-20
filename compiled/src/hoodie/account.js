// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __slice = [].slice;

Hoodie.Account = (function() {

  Account.prototype.username = void 0;

  function Account(hoodie) {
    this.hoodie = hoodie;
    this._handleChangeUsernameAndPasswordRequest = __bind(this._handleChangeUsernameAndPasswordRequest, this);

    this._sendChangeUsernameAndPasswordRequest = __bind(this._sendChangeUsernameAndPasswordRequest, this);

    this._cleanup = __bind(this._cleanup, this);

    this._handleFetchBeforeDestroySucces = __bind(this._handleFetchBeforeDestroySucces, this);

    this._handlePasswordResetStatusRequestError = __bind(this._handlePasswordResetStatusRequestError, this);

    this._handlePasswordResetStatusRequestSuccess = __bind(this._handlePasswordResetStatusRequestSuccess, this);

    this._checkPasswordResetStatus = __bind(this._checkPasswordResetStatus, this);

    this._handleSignInSuccess = __bind(this._handleSignInSuccess, this);

    this._delayedSignIn = __bind(this._delayedSignIn, this);

    this._handleSignUpSucces = __bind(this._handleSignUpSucces, this);

    this._handleRequestError = __bind(this._handleRequestError, this);

    this._handleAuthenticateSuccess = __bind(this._handleAuthenticateSuccess, this);

    this.fetch = __bind(this.fetch, this);

    this.authenticate = __bind(this.authenticate, this);

    this.username = this.hoodie.my.config.get('_account.username');
    this.ownerHash = this.hoodie.my.config.get('_account.ownerHash');
    if (!this.ownerHash) {
      this.ownerHash = this.hoodie.my.store.uuid();
      this.hoodie.my.config.set('_account.ownerHash', this.ownerHash);
    }
    window.setTimeout(this.authenticate);
    this._checkPasswordResetStatus();
  }

  Account.prototype.authenticate = function() {
    if (!this.username) {
      this._sendSignOutRequest();
      return this.hoodie.defer().reject().promise();
    }
    if (this._authenticated === true) {
      return this.hoodie.defer().resolve(this.username).promise();
    }
    if (this._authenticated === false) {
      return this.hoodie.defer().reject().promise();
    }
    return this.hoodie.request('GET', "/_session").pipe(this._handleAuthenticateSuccess, this._handleRequestError);
  };

  Account.prototype.signUp = function(username, password) {
    var options;
    if (password == null) {
      password = '';
    }
    if (!username) {
      return this.hoodie.defer().reject({
        error: 'username must be set'
      }).promise();
    }
    if (this.hasAnonymousAccount()) {
      return this._upgradeAnonymousAccount(username, password);
    }
    if (this.hasAccount()) {
      return this.hoodie.defer().reject({
        error: 'you have to sign out first'
      }).promise();
    }
    options = {
      data: JSON.stringify({
        _id: this._key(username),
        name: this._userKey(username),
        type: 'user',
        roles: [],
        password: password,
        ownerHash: this.ownerHash,
        database: this.db()
      }),
      contentType: 'application/json'
    };
    return this.hoodie.request('PUT', this._url(username), options).pipe(this._handleSignUpSucces(username, password), this._handleRequestError);
  };

  Account.prototype.anonymousSignUp = function() {
    var password, username,
      _this = this;
    password = this.hoodie.my.store.uuid(10);
    username = this.ownerHash;
    return this.signUp(username, password).pipe(null, this._handleRequestError).done(function() {
      _this.hoodie.my.config.set('_account.anonymousPassword', password);
      return _this.trigger('signup:anonymous', username);
    });
  };

  Account.prototype.hasAccount = function() {
    return this.username != null;
  };

  Account.prototype.hasAnonymousAccount = function() {
    return this.hoodie.my.config.get('_account.anonymousPassword') != null;
  };

  Account.prototype.signIn = function(username, password) {
    var options,
      _this = this;
    if (password == null) {
      password = '';
    }
    options = {
      data: {
        name: this._userKey(username),
        password: password
      }
    };
    return this._withPreviousRequestsAborted('signIn', function() {
      var promise;
      promise = _this.hoodie.request('POST', '/_session', options);
      return promise.pipe(_this._handleSignInSuccess, _this._handleRequestError);
    });
  };

  Account.prototype.login = Account.prototype.signIn;

  Account.prototype.signOut = function() {
    if (!this.hasAccount()) {
      this._cleanup();
      return;
    }
    this.hoodie.my.remote.disconnect();
    return this._sendSignOutRequest().pipe(this._cleanup);
  };

  Account.prototype.logout = Account.prototype.signOut;

  Account.prototype.on = function(event, cb) {
    event = event.replace(/(^| )([^ ]+)/g, "$1account:$2");
    return this.hoodie.on(event, cb);
  };

  Account.prototype.trigger = function() {
    var event, parameters, _ref;
    event = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return (_ref = this.hoodie).trigger.apply(_ref, ["account:" + event].concat(__slice.call(parameters)));
  };

  Account.prototype.db = function() {
    return "user/" + this.ownerHash;
  };

  Account.prototype.fetch = function(username) {
    var _this = this;
    if (username == null) {
      username = this.username;
    }
    if (!username) {
      return this.hoodie.defer().reject({
        error: "unauthenticated",
        reason: "not logged in"
      }).promise();
    }
    return this._withSingleRequest('fetch', function() {
      return _this.hoodie.request('GET', _this._url(username)).pipe(null, _this._handleRequestError).done(function(response) {
        return _this._doc = response;
      });
    });
  };

  Account.prototype.changePassword = function(currentPassword, newPassword) {
    if (!this.username) {
      return this.hoodie.defer().reject({
        error: "unauthenticated",
        reason: "not logged in"
      }).promise();
    }
    this.hoodie.my.remote.disconnect();
    return this.fetch().pipe(this._sendChangeUsernameAndPasswordRequest(currentPassword, null, newPassword), this._handleRequestError);
  };

  Account.prototype.resetPassword = function(username) {
    var data, key, options, resetPasswordId,
      _this = this;
    if (resetPasswordId = this.hoodie.my.config.get('_account.resetPasswordId')) {
      return this._checkPasswordResetStatus();
    }
    resetPasswordId = "" + username + "/" + (this.hoodie.my.store.uuid());
    this.hoodie.my.config.set('_account.resetPasswordId', resetPasswordId);
    key = "" + this._prefix + ":$passwordReset/" + resetPasswordId;
    data = {
      _id: key,
      name: "$passwordReset/" + resetPasswordId,
      type: 'user',
      roles: [],
      password: resetPasswordId,
      $createdAt: new Date,
      $updatedAt: new Date
    };
    options = {
      data: JSON.stringify(data),
      contentType: "application/json"
    };
    return this._withPreviousRequestsAborted('resetPassword', function() {
      return _this.hoodie.request('PUT', "/_users/" + (encodeURIComponent(key)), options).pipe(null, _this._handleRequestError).done(_this._checkPasswordResetStatus);
    });
  };

  Account.prototype.changeUsername = function(currentPassword, newUsername) {
    return this._changeUsernameAndPassword(currentPassword, newUsername);
  };

  Account.prototype.destroy = function() {
    if (!this.hasAccount()) {
      this._cleanup();
      return;
    }
    return this.fetch().pipe(this._handleFetchBeforeDestroySucces, this._handleRequestError).pipe(this._cleanup);
  };

  Account.prototype._prefix = 'org.couchdb.user';

  Account.prototype._doc = {};

  Account.prototype._requests = {};

  Account.prototype._setUsername = function(username) {
    this.username = username;
    return this.hoodie.my.config.set('_account.username', this.username);
  };

  Account.prototype._setOwner = function(ownerHash) {
    this.ownerHash = ownerHash;
    return this.hoodie.my.config.set('_account.ownerHash', this.ownerHash);
  };

  Account.prototype._handleAuthenticateSuccess = function(response) {
    var defer;
    defer = this.hoodie.defer();
    if (response.userCtx.name) {
      this._authenticated = true;
      this._setUsername(response.userCtx.name.replace(/^user(_anonymous)?\//, ''));
      this._setOwner(response.userCtx.roles[0]);
      defer.resolve(this.username);
    } else {
      this._authenticated = false;
      this.trigger('error:unauthenticated');
      defer.reject();
    }
    return defer.promise();
  };

  Account.prototype._handleRequestError = function(xhr) {
    var error;
    if (xhr == null) {
      xhr = {};
    }
    try {
      error = JSON.parse(xhr.responseText);
    } catch (e) {
      error = {
        error: xhr.responseText || "unknown"
      };
    }
    return this.hoodie.defer().reject(error).promise();
  };

  Account.prototype._handleSignUpSucces = function(username, password) {
    var defer,
      _this = this;
    defer = this.hoodie.defer();
    return function(response) {
      _this.trigger('signup', username);
      _this._doc._rev = response.rev;
      return _this._delayedSignIn(username, password);
    };
  };

  Account.prototype._delayedSignIn = function(username, password) {
    var defer,
      _this = this;
    defer = this.hoodie.defer();
    window.setTimeout((function() {
      var promise;
      promise = _this.signIn(username, password);
      promise.done(defer.resolve);
      return promise.fail(function(error) {
        if (error.error === 'unconfirmed') {
          return _this._delayedSignIn(username, password);
        } else {
          return defer.reject.apply(defer, arguments);
        }
      });
    }), 300);
    return defer.promise();
  };

  Account.prototype._handleSignInSuccess = function(response) {
    var defer, username,
      _this = this;
    defer = this.hoodie.defer();
    username = response.name.replace(/^user(_anonymous)?\//, '');
    if (~response.roles.indexOf("error")) {
      this.fetch(username).fail(defer.reject).done(function() {
        return defer.reject({
          error: "error",
          reason: _this._doc.$error
        });
      });
      return defer.promise();
    }
    if (!~response.roles.indexOf("confirmed")) {
      return defer.reject({
        error: "unconfirmed",
        reason: "account has not been confirmed yet"
      });
    }
    this._authenticated = true;
    this._setUsername(username);
    this._setOwner(response.roles[0]);
    if (this.hasAnonymousAccount()) {
      this.trigger('signin:anonymous', username);
    } else {
      this.trigger('signin', username);
    }
    this.fetch();
    return defer.resolve(this.username, response.roles[0]);
  };

  Account.prototype._checkPasswordResetStatus = function() {
    var hash, options, resetPasswordId, url, username,
      _this = this;
    resetPasswordId = this.hoodie.my.config.get('_account.resetPasswordId');
    if (!resetPasswordId) {
      return this.hoodie.defer().reject({
        error: "missing"
      }).promise();
    }
    username = "$passwordReset/" + resetPasswordId;
    url = "/_users/" + (encodeURIComponent("" + this._prefix + ":" + username));
    hash = btoa("" + username + ":" + resetPasswordId);
    options = {
      headers: {
        Authorization: "Basic " + hash
      }
    };
    return this._withPreviousRequestsAborted('passwordResetStatus', function() {
      return _this.hoodie.request('GET', url, options).pipe(_this._handlePasswordResetStatusRequestSuccess, _this._handlePasswordResetStatusRequestError).fail(function(error) {
        if (error.error === 'pending') {
          window.setTimeout(_this._checkPasswordResetStatus, 1000);
          return;
        }
        return _this.trigger('password_reset:error');
      });
    });
  };

  Account.prototype._handlePasswordResetStatusRequestSuccess = function(response) {
    var defer;
    defer = this.hoodie.defer();
    if (response.$error) {
      defer.reject(response.$error);
    } else {
      defer.reject({
        error: 'pending'
      });
    }
    return defer.promise();
  };

  Account.prototype._handlePasswordResetStatusRequestError = function(xhr) {
    if (xhr.status === 401) {
      this.hoodie.my.config.remove('_account.resetPasswordId');
      this.trigger('passwordreset');
      return this.hoodie.defer().resolve();
    } else {
      return this._handleRequestError(xhr);
    }
  };

  Account.prototype._changeUsernameAndPassword = function(currentPassword, newUsername, newPassword) {
    var _this = this;
    return this.signIn(this.username, currentPassword).pipe(function() {
      return _this.fetch().pipe(_this._sendChangeUsernameAndPasswordRequest(currentPassword, newUsername, newPassword));
    });
  };

  Account.prototype._upgradeAnonymousAccount = function(username, password) {
    var currentPassword,
      _this = this;
    currentPassword = this.hoodie.my.config.get('_account.anonymousPassword');
    return this._changeUsernameAndPassword(currentPassword, username, password).done(function() {
      _this.trigger('signup', username);
      return _this.hoodie.my.config.remove('_account.anonymousPassword');
    });
  };

  Account.prototype._handleFetchBeforeDestroySucces = function() {
    var _this = this;
    this.hoodie.my.remote.disconnect();
    this._doc._deleted = true;
    return this._withPreviousRequestsAborted('updateUsersDoc', function() {
      return _this.hoodie.request('PUT', _this._url(), {
        data: JSON.stringify(_this._doc),
        contentType: 'application/json'
      });
    });
  };

  Account.prototype._cleanup = function() {
    delete this.username;
    delete this._authenticated;
    this.hoodie.my.config.clear();
    this.trigger('signout');
    this.ownerHash = this.hoodie.my.store.uuid();
    return this.hoodie.my.config.set('_account.ownerHash', this.ownerHash);
  };

  Account.prototype._userKey = function(username) {
    if (username === this.ownerHash) {
      return "user_anonymous/" + username;
    } else {
      return "user/" + username;
    }
  };

  Account.prototype._key = function(username) {
    if (username == null) {
      username = this.username;
    }
    return "" + this._prefix + ":" + (this._userKey(username));
  };

  Account.prototype._url = function(username) {
    return "/_users/" + (encodeURIComponent(this._key(username)));
  };

  Account.prototype._sendChangeUsernameAndPasswordRequest = function(currentPassword, newUsername, newPassword) {
    var _this = this;
    return function() {
      var data, options;
      data = $.extend({}, _this._doc);
      if (newUsername) {
        data.$newUsername = newUsername;
      }
      if (newPassword != null) {
        delete data.salt;
        delete data.password_sha;
        data.password = newPassword;
      }
      options = {
        data: JSON.stringify(data),
        contentType: 'application/json'
      };
      return _this._withPreviousRequestsAborted('updateUsersDoc', function() {
        return _this.hoodie.request('PUT', _this._url(), options).pipe(_this._handleChangeUsernameAndPasswordRequest(newUsername, newPassword || currentPassword), _this._handleRequestError);
      });
    };
  };

  Account.prototype._handleChangeUsernameAndPasswordRequest = function(newUsername, newPassword) {
    var _this = this;
    return function() {
      _this.hoodie.my.remote.disconnect();
      if (newUsername) {
        return _this._delayedSignIn(newUsername, newPassword);
      } else {
        return _this.signIn(_this.username, newPassword);
      }
    };
  };

  Account.prototype._withPreviousRequestsAborted = function(name, requestFunction) {
    var _ref;
    if ((_ref = this._requests[name]) != null) {
      if (typeof _ref.abort === "function") {
        _ref.abort();
      }
    }
    return this._requests[name] = requestFunction();
  };

  Account.prototype._withSingleRequest = function(name, requestFunction) {
    var _ref;
    if (((_ref = this._requests[name]) != null ? typeof _ref.state === "function" ? _ref.state() : void 0 : void 0) === 'pending') {
      return this._requests[name];
    }
    return this._requests[name] = requestFunction();
  };

  Account.prototype._sendSignOutRequest = function() {
    var _this = this;
    return this._withSingleRequest('signOut', function() {
      return _this.hoodie.request('DELETE', '/_session').pipe(null, _this._handleRequestError);
    });
  };

  return Account;

})();
