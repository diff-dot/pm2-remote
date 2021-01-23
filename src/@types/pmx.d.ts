declare module 'pmx' {
  function initModule<Config extends Record<string, string | number | null>>(
    opts: { pid?: number },
    cb: (error: Error, config: Config) => void
  ): void;
}
