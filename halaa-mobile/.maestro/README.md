# Direction screenshot suite

These deterministic flows exercise the same audited source on both native
platforms without an account or backend fixture. Each locale captures the
shared field contract and the invitation preview.

Build/install the `visual-test` EAS profile for the target simulator/emulator,
then run:

```sh
maestro test .maestro/direction-ar.yaml
maestro test .maestro/direction-en.yaml
```

Run both flows once on an Android emulator and once on an iOS simulator. Keep
the four screenshots from each platform as the release-candidate visual
artifacts; Maestro assertions fail if the localized fixture or preview cannot
be rendered.
