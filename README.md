# Travel Tefuda

Central Europe 2026 travel journal and social card assets.

## Website

- Primary domain: https://travel-tefuda.com
- Cloudflare Pages fallback: https://travel-tefuda.pages.dev
- GitHub repository: https://github.com/longlongnero/travel-tefuda

## Structure

- `outputs/central-europe-2026/html-guide/` - deployed static website
- `outputs/central-europe-2026/html-guide/deploy-guide.html` - bilingual public deployment walkthrough with mock configuration screenshots
- `outputs/central-europe-2026/social-cards/` - social card source and exported images

## Update Flow

1. Edit the local HTML guide or social card files.
2. Commit the change.
3. Push to `main`.
4. Cloudflare Pages deploys `outputs/central-europe-2026/html-guide/`.

## Cloudflare Pages Custom Domain DNS

Cloudflare Pages project: `travel-tefuda`

Public fallback URL:

```text
https://travel-tefuda.pages.dev
```

Custom domains added in Cloudflare Pages:

```text
travel-tefuda.com
www.travel-tefuda.com
```

Set these DNS records at the domain provider. If the domain is managed by Cloudflare DNS, use proxied CNAME records and Cloudflare will flatten the apex record automatically:

```text
CNAME  @    travel-tefuda.pages.dev
CNAME  www  travel-tefuda.pages.dev
```

If the domain is not managed by Cloudflare DNS and the provider does not allow a CNAME at `@`, use an ALIAS/ANAME/CNAME-flattening record for the apex domain, pointing to `travel-tefuda.pages.dev`.
