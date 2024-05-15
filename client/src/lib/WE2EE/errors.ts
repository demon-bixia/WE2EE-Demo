export class ExchangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeError";
  }
}

export class IndexedDBConnectionError extends Error {
  constructor() {
    super("Unable to connect to IndexedDB");
    this.name = "IndexedDBConnectionError";
  }
}

export class IndexedDBTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexedDBTransactionError";
  }
}

export class IndexedDBNoPassword extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexedDBNoPassword";
  }
}

export class IndexedDBNotFound extends Error {
  constructor() {
    super("Requested object not found in keystore");
    this.name = "IndexedDBKeyNotFound";
  }
}

export class IndexedDBInvalidInput extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexedDBInvalidInput";
  }
}
