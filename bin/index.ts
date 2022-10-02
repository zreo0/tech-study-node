import chalk from 'chalk';
import schedule from 'node-schedule';
import pup from 'puppeteer-core';
import handleBrowser from '../src/app';
import API_CONFIG from '../src/config/api';
import PUP_CONFIG from '../src/config/pup';
import PUSH_CONFIG from '../src/config/push';
import STUDY_CONFIG from '../src/config/study';
import URL_CONFIG from '../src/config/url';
import shared from '../src/shared';
import { getHighlightHTML, getRestTaskList } from '../src/utils';

type Config = {
  apiConfig: Partial<typeof API_CONFIG>;
  pupConfig: Partial<typeof PUP_CONFIG>;
  pushConfig: Partial<typeof PUSH_CONFIG>;
  studyConfig: Partial<typeof STUDY_CONFIG>;
  urlConfig: Partial<typeof URL_CONFIG>;
};
/**
 * @description 定义配置
 */
export const defineConfig = (config: Config) => {
  const { apiConfig, pupConfig, pushConfig, studyConfig, urlConfig } = config;
  // 合并配置
  Object.assign(API_CONFIG, apiConfig);
  Object.assign(PUP_CONFIG, pupConfig);
  Object.assign(PUSH_CONFIG, pushConfig);
  Object.assign(STUDY_CONFIG, studyConfig);
  Object.assign(URL_CONFIG, urlConfig);
};

/**
 * @description 处理任务
 * @param token
 * @param nick
 */
export const handleTask = async (token: string, nick: string) => {
  // 开始日志
  shared.log.start();
  // 初始化消息当前用户token
  shared.setToken(token);
  // 昵称
  shared.setNick(nick);
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  shared.log.success('已打开浏览器!');
  try {
    // 处理浏览器
    await handleBrowser(browser);
    // 关闭浏览器
    await browser.close();
    shared.log.info('已关闭浏览器!');
  } catch (e: any) {
    // 关闭浏览器
    await browser.close();
    shared.log.warn('发生错误，已关闭浏览器!');
    // 错误
    const err = new Error(e);
    shared.log.fail([
      `${chalk.red(err.name)}`,
      `${chalk.red(err.message)}`,
      `${chalk.red(err.cause)}`,
      `${chalk.red(err.stack || 'unkown stack')}`,
    ]);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        '发生错误!',
        err.name,
        err.message,
        String(err.cause),
        err.stack || 'unkown stack',
      ],
      type: 'fail',
    });
  }
  // 剩余任务
  const rest = getRestTaskList(PUSH_CONFIG.list);
  // 存在下次任务
  if (rest.length) {
    shared.log.warn('服务提示');
    shared.log.info(`用户: ${chalk.yellow(nick)}, 定时任务已执行完毕!`);
    shared.log.info(`今天剩余任务数: ${chalk.yellow(rest.length)} 个`);
    shared.log.warn(`下次任务信息`);
    shared.log.info(`用户: ${chalk.yellow(rest[0].nick)}`);
    shared.log.info(`时间: ${chalk.yellow(rest[0].timeText)}`);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(nick)}, 定时任务完成!`,
        `今天剩余任务数: ${getHighlightHTML(rest.length)} 个`,
        '下次任务信息: ',
        `用户: ${getHighlightHTML(rest[0].nick)}`,
        `时间: ${getHighlightHTML(rest[0].timeText)}`,
      ],
      type: 'info',
    });
  } else {
    shared.log.warn('服务提示');
    shared.log.info(`用户: ${chalk.yellow(nick)}, 定时任务已执行完毕!`);
    shared.log.success(`今天定时任务均已完成!`);
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(nick)}, 定时任务完成!`,
        `今天定时任务均已完成!`,
      ],
      type: 'info',
    });
  }
  // 结束日志
  shared.log.finish();
};

/**
 * @description 开始定时任务
 */
export const startTask = () => {
  // 剩余任务
  const rest = getRestTaskList(PUSH_CONFIG.list);
  // 推送服务提示
  shared.pushModalTips({
    title: '服务提示',
    content: [
      '已运行定时任务!',
      `今天剩余任务数: ${getHighlightHTML(rest.length)} 个`,
      '剩余任务信息: ',
      ...rest
        .map((item) => {
          return [
            `用户: ${getHighlightHTML(item.nick)}`,
            `时间: ${getHighlightHTML(item.timeText)}`,
          ];
        })
        .flat(),
    ],
    type: 'info',
  });
  // 执行清除日志任务
  schedule.scheduleJob('0 0 0 * * ?', () => {
    // 清除日志
    shared.log.autoClean();
  });
  // 定时任务
  PUSH_CONFIG.list.forEach((sendInfo, i) => {
    console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 执行定时任务`);
    // 执行定时任务
    schedule.scheduleJob(sendInfo.cron, async () => {
      console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 正在执行定时任务...`);
      // 处理任务
      await handleTask(sendInfo.token, sendInfo.nick);
    });
  });
};

// 开始任务
startTask()