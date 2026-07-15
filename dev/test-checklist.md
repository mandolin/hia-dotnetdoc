# Test Checklist

- `npm run check:syntax`
- `npm run check:skeleton`
- `npm run check:dotnet-helper`
- `npm run build:fixtures`
- `npm run check:fixtures`
- `npm run check:standalone`
- `npm run check:license`
- `npm run check:pack`
- `npm test`
- `npm run release:gate`

Before publishing, also run a standalone consumer smoke against packed or published packages.
