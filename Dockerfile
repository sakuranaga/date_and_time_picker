# Development container: install, build and test run here only (never npm on the host).
# The image is pinned by digest so that a re-tagged node:24 cannot change it.
FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9

# node_modules lives in a named volume (see compose.yaml); creating it here as the node user's
# lets the empty volume inherit that owner on first use.
RUN mkdir -p /work/node_modules && chown -R node:node /work
USER node
WORKDIR /work
