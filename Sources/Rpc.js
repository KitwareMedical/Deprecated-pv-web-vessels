import React from 'react';

import SmartConnect from 'wslink/src/SmartConnect';

// Only try to connect 20 times
const MAX_CONN_ATTEMPTS = 10;
const RETRY_TIMEOUT = 500; // milliseconds

function defer() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

function RpcClientHOC(Component, client) {
  return function ComponentWrapper(props) {
    return <Component rpcClient={client} {...props} />;
  };
}

class Client {
  constructor(apiDefinition) {
    this.waitForConnect = defer();
    this.connection = null;
    this.session = null;

    this.api = Object.freeze(
      apiDefinition(this.makeRpc.bind(this), this.makePubSub.bind(this))
    );
  }

  setToReady(connection) {
    this.connection = connection;
    this.session = connection.getSession();

    this.waitForConnect.resolve();
  }

  makeRpc(endpoint) {
    return (...args) =>
      this.waitForConnect.promise.then(() => this.session.call(endpoint, args));
  }

  makePubSub(endpoint) {
    return (callback) =>
      this.waitForConnect.promise
        .then(() => this.session.subscribe(endpoint, callback))
        // return an unsubscribe function
        .then(() => () => this.session.unsubscribe(callback));
  }
}

class Rpc {
  constructor(apiDefinition, config) {
    this.config = config;
    this.connection = null;
    this.client = new Client(apiDefinition);
  }

  getClient() {
    return this.client.api;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connection) {
        reject(new Error('Connection exists'));
      }

      const smartConnect = SmartConnect.newInstance({
        config: {
          application: this.config.application,
          sessionManagerURL: 'file://dummyurl',
          sessionURL: `ws://${this.config.host}:${this.config.port}/ws`,
        },
      });

      smartConnect.onConnectionReady((connection) => {
        this.connection = connection;
        this.client.setToReady(connection);
      });

      // retry logic for connection
      let retryCount = 0;
      const scheduleConnect = () => {
        ++retryCount;
        if (retryCount <= MAX_CONN_ATTEMPTS) {
          // Don't need exponential back-off for local connection
          setTimeout(() => smartConnect.connect(), RETRY_TIMEOUT);
        } else {
          reject(new Error('Failed to connect'));
        }
      };
      smartConnect.onConnectionError(scheduleConnect);

      scheduleConnect();
    });
  }
}

export { RpcClientHOC };
export default Rpc;
