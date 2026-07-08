# Travel Tefuda

Central Europe 2026 travel journal and social card assets.

## Website

- Primary domain: https://travel-tefuda.com
- GitHub Pages fallback: https://longlongnero.github.io/travel-tefuda/

## Structure

- `outputs/central-europe-2026/html-guide/` - deployed static website
- `outputs/central-europe-2026/social-cards/` - social card source and exported images

## Update Flow

1. Edit the local HTML guide or social card files.
2. Commit the change.
3. Push to `main`.
4. GitHub Actions deploys `outputs/central-europe-2026/html-guide/` to GitHub Pages.

## Custom Domain DNS

Set these records at the domain provider for `travel-tefuda.com`:

```text
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
AAAA  @    2606:50c0:8000::153
AAAA  @    2606:50c0:8001::153
AAAA  @    2606:50c0:8002::153
AAAA  @    2606:50c0:8003::153
CNAME www  longlongnero.github.io
```

After DNS propagates, enable **Enforce HTTPS** in GitHub Pages if it is not enabled automatically.
