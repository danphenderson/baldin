export interface BrowserNavigationOptions {
  replace?: boolean;
}

export function navigateInBrowser(
  path: string,
  options: BrowserNavigationOptions = {},
): void {
  if (options.replace) {
    window.location.replace(path);
    return;
  }

  window.location.assign(path);
}
