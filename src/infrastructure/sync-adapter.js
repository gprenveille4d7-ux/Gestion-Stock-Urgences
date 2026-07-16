export class LocalOnlySyncAdapter {
  constructor() {
    this.kind = 'local-only';
  }

  async synchronize(outbox) {
    return {
      status: 'local-only',
      pending: outbox.filter((entry) => entry.status === 'pending').length,
      sent: 0,
      message: 'Aucun serveur configuré. Les événements restent conservés sur cet appareil.'
    };
  }
}

