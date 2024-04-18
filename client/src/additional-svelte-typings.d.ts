declare namespace svelteHTML {
  // enhance attributes
  interface HTMLAttributes<T> {
    // If you want to use on:beforeinstallprompt
    'on:outside'?: (event: any) => any;
  }
}