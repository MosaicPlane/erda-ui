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

/**
 * 应用版本简易生成
 * 1、所谓版本就是时间戳，因为前端代码不变更时进行打包，不会重新打包
 * 2、此方案并不能解决强制打包时或前端项目的非业务代码发生变更导致的Dice打包时，前端版本的变更情况
 */
import fs from 'fs';
import { getPublicDir } from './env';
import { logSuccess } from './log';

export const versionFromEnvironment = (): number => {
  const value = process.env.SOURCE_DATE_EPOCH;
  if (!value || !/^[0-9]+$/.test(value)) {
    throw new Error('SOURCE_DATE_EPOCH must be an integer Unix timestamp');
  }
  return Number(value) * 1000;
};

const GenVersion = () => {
  const data = { version: versionFromEnvironment() };
  fs.mkdirSync(getPublicDir(), { recursive: true });
  fs.writeFileSync(`${getPublicDir()}/version.json`, `${JSON.stringify(data)}\n`);
  logSuccess('version.json generated ok.');
};

export default GenVersion;
