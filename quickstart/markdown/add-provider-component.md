Wrap your React app with the `Auth0Provider` to provide the authentication context.

Required props:
- `domain`: your Auth0 tenant's domain
- `clientId`: Your Auth0 Application's Client ID
- `authorizationParams.redirect_uri`: the URL to redirect back from Auth0 after authenticating.
