// Copyright (c) 2021 Terminus, Inc.
//
// This program is free software: you can use, redistribute, and/or modify
// it under the terms of the GNU Affero General Public License, version 3
// or later ("AGPL"), as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH;
if (!sourceDateEpoch || !/^[0-9]+$/.test(sourceDateEpoch)) {
  throw new Error('SOURCE_DATE_EPOCH must be an integer Unix timestamp');
}
const vcsRef = process.env.VCS_REF;
if (!vcsRef || !/^[0-9a-f]{40}$/.test(vcsRef)) {
  throw new Error('VCS_REF must be a full lowercase commit SHA');
}
const buildTime = new Date(Number(sourceDateEpoch) * 1000).toISOString();
const banner = `module: ${path.basename(__dirname)}
commit: ${vcsRef.slice(0, 6)}
buildTime: ${buildTime}
buildBy: mosaicplane`;

module.exports = {
  mode: 'production',
  output: {
    path: path.resolve(__dirname, '../public/static/core'),
    filename: 'scripts/[name].js',
    chunkFilename: 'scripts/[chunkhash].chunk.js',
    publicPath: '/static/core/',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new webpack.BannerPlugin(banner),
      new TerserPlugin({
        parallel: true,
        extractComments: false,
      }),
    ],
  },
};
