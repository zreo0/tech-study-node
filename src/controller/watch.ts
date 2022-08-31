import chalk from 'chalk';
import STUDY_CONFIG from '../config/study';
import { getTaskList } from './user';
import { videoList, newsList } from '../apis';
import shared from '../shared';
/**
 * @description 读文章 | 看视频
 * @returns
 */
const handleWatch = async (type: number) => {
  // 读新闻
  if (type === 0) {
    await handleReadNews();
  }
  // 看视频
  if (type === 1) {
    await handleWatchVideo();
  }
};

/**
 * @description 处理读文章
 */
const handleReadNews = async () => {
  // 获取新闻
  const news = await getTodayNews();
  //遍历文章
  for (const i in news) {
    // 跳转页面
    const res = await shared.gotoPage(news[i].url, {
      waitUntil: 'domcontentloaded',
    });
    //  跳过跳转失败
    if (!res) {
      shared.progress.fail(
        `${chalk.blueBright(Number(i) + 1)} / ${
          news.length
        } | 标题: ${chalk.blueBright(
          news[i].title.substring(0, 15)
        )} 页面跳转失败!`
      );
      continue;
    }
    shared.progress.info(
      `${chalk.blueBright(Number(i) + 1)} / ${
        news.length
      } | 标题: ${chalk.blueBright(news[i].title.substring(0, 15))}`
    );
    // 看新闻时间
    const duration = ~~(Math.random() * 20 + 80);
    // 倒计时
    await countDown(duration, (duration) => {
      // 倒计时存在
      if (duration) {
        shared.progress.start(`观看剩余时间: ${chalk.blueBright(duration)} s`);
        return;
      }
      shared.progress.succeed('已观看完当前新闻!');
    });
    // 任务进度
    const taskList = await getTaskList();
    // 提前完成
    if (taskList && taskList[0].status) {
      break;
    }
  }
  // 任务进度
  const taskList = await getTaskList();
  // 未完成
  if (taskList && !taskList[0].status) {
    shared.progress.info('未完成任务, 继续看新闻!');
    // 继续观看
    await handleReadNews();
  }
};

/**
 * @description 处理看视频
 */
const handleWatchVideo = async () => {
  // 获取视频
  const videos = await getTodayVideos();
  // 遍历视频
  for (const i in videos) {
    // 页面跳转
    const gotoRes = await shared.gotoPage(videos[i].url, {
      waitUntil: 'domcontentloaded',
    });
    // 跳转失败
    if (!gotoRes) {
      shared.progress.fail(
        `${chalk.blueBright(Number(i) + 1)} / ${
          videos.length
        } | 标题: ${chalk.blueBright(
          videos[i].title.substring(0, 15)
        )} 页面跳转失败!`
      );
      // 跳过
      continue;
    }
    shared.progress.info(
      `${chalk.blueBright(Number(i) + 1)} / ${
        videos.length
      } | 标题: ${chalk.blueBright(videos[i].title.substring(0, 15))}`
    );
    // 播放视频
    const waitRes = await waitVideos();
    // 播放失败
    if (!waitRes) {
      shared.progress.info('观看失败, 跳过此视频!');
      continue;
    }
    // 看视频时间
    const duration = ~~(Math.random() * 80 + 100);
    // 倒计时
    await countDown(duration, (duration) => {
      // 倒计时存在
      if (duration) {
        shared.progress.start(`观看剩余时间: ${chalk.blueBright(duration)} s`);
        return;
      }
      shared.progress.succeed('已观看完当前视频!');
    });
    // 任务进度
    const taskList = await getTaskList();
    // 提前完成
    if (taskList && taskList[1].status) {
      break;
    }
  }
  // 任务进度
  const taskList = await getTaskList();
  // 未完成
  if (taskList && !taskList[1].status) {
    shared.progress.info('未完成任务, 继续看视频!');
    // 继续观看
    await handleWatchVideo();
  }
  return true;
};

/**
 * @description 获取新闻
 * @returns
 */
const getTodayNews = async () => {
  // 任务进度
  const taskList = await getTaskList();
  // 新闻
  const news: NewsVideoList = [];
  if (taskList) {
    // 最大新闻数
    const { maxNewsNum } = STUDY_CONFIG;
    // 新闻数
    const newsNum = taskList[0].need;
    // 需要学习的新闻数量
    const need = newsNum < maxNewsNum ? newsNum : maxNewsNum;
    // 获取重要新闻
    const newsList = await getNews();

    // 存在新闻列表
    if (newsList && newsList.length) {
      // 数量补足需要数量
      while (news.length < need) {
        // 随便取
        const randomIndex = ~~(Math.random() * (newsList.length + 1));
        // 新闻
        const item = newsList[randomIndex];
        // 是否存在视频
        if (item.dataValid && item.type === 'tuwen') {
          news.push(newsList[randomIndex]);
        }
      }
    }
  }
  return news;
};

/**
 * @description 获取视频
 * @returns
 */
const getTodayVideos = async () => {
  // 任务进度
  const taskList = await getTaskList();
  // 视频
  const videos: NewsVideoList = [];
  if (taskList) {
    // 最大视频数
    const { maxVideoNum } = STUDY_CONFIG;
    // 视频数
    const videoNum = taskList[1].need;
    // 需要学习的视频数量
    const need = videoNum < maxVideoNum ? videoNum : maxVideoNum;
    // 获取重要视频
    const videoList = await getVideos();
    // 存在视频列表
    if (videoList && videoList.length) {
      // 数量补足需要数量
      while (videos.length < need) {
        // 随便取
        const randomIndex = ~~(Math.random() * (videoList.length + 1));
        // 视频
        const item = videoList[randomIndex];
        // 是否存在视频
        if (
          item.dataValid &&
          (item.type === 'shipin' || item.type === 'juji')
        ) {
          videos.push(videoList[randomIndex]);
        }
      }
    }
  }
  return videos;
};

/**
 * @description 等待视频
 * @returns
 */
const waitVideos = async () => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return false;
  }
  // 视频可以播放
  const canPlay = await page.evaluate((time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(() => {
        // iframe
        const iframe = document.querySelector<HTMLIFrameElement>('iframe');
        // 视频
        let video: HTMLVideoElement | null;
        // 获取播放器
        if (iframe && iframe.contentWindow) {
          // 如果有iframe,说明外面的video标签是假的
          video =
            iframe.contentWindow.document.querySelector<HTMLVideoElement>(
              'video'
            );
        } else {
          video = document.querySelector<HTMLVideoElement>('video');
        }
        // 视频可播放
        if (video) {
          // 清除计时器
          clearInterval(timer);
          // 是否可播放
          video.addEventListener('canplay', () => {
            clearInterval(timeout);
            resolve(true);
          });
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 无法播放
  if (!canPlay) {
    return false;
  }

  // 播放视频
  const playing = await page.evaluate(async (time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(async () => {
        const iframe = document.querySelector<HTMLIFrameElement>('iframe');
        // 视频
        let video: HTMLVideoElement | null;
        // 播放按钮
        let pauseButton: HTMLButtonElement | null;
        if (iframe) {
          // 如果有iframe,说明外面的video标签是假的
          video = <HTMLVideoElement>(
            iframe.contentWindow?.document.querySelector('video')
          );
          pauseButton = <HTMLButtonElement>(
            iframe.contentWindow?.document.querySelector('.prism-play-btn')
          );
        } else {
          // 否则这个video标签是真的
          video = document.querySelector<HTMLVideoElement>('video');
          pauseButton =
            document.querySelector<HTMLButtonElement>('.prism-play-btn');
        }
        // 获取视频、播放按钮
        if (video && pauseButton) {
          // 静音
          video.muted = true;
          // 播放
          if (video.paused) {
            // js播放
            await video.play();
          }
          if (video.paused) {
            // 点击播放
            pauseButton.click();
          }
          // 播放
          if (!video.paused) {
            // 清除计时器
            clearInterval(timer);
            clearInterval(timeout);
            resolve(true);
          }
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 无法播放
  if (!playing) {
    return false;
  }
  return true;
};

/**
 * @description 倒计时
 * @param progress
 * @returns
 */
const countDown = (duration: number, callback: (duration: number) => void) => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return false;
  }
  // 滚动延迟
  const startScoll = duration - 5;
  const endScoll = 5;
  return new Promise<boolean>((resolve) => {
    // 定时器
    const timer = setInterval(async () => {
      callback(duration);
      if (!duration) {
        callback(duration);
        clearInterval(timer);
        resolve(true);
      }
      // 下拉
      if (duration === startScoll) {
        await page.evaluate(() => {
          const scrollLength = document.body.scrollHeight / 3;
          window.scrollTo(0, scrollLength);
        });
      }
      // 回滚
      if (duration === endScoll) {
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
      }
      duration--;
    }, 1000);
  });
};

/**
 * @description 新闻列表
 */
export type NewsVideoList = {
  publishTime: string;
  title: string;
  type: string;
  url: string;
  showSource: string;
  auditTime: string;
  dataValid: boolean;
  itemType: string;
}[];
/**
 * @description 获取视频
 * @returns
 */
export const getVideos = async () => {
  // 视频数据
  const data = await videoList();
  if (data) {
    return <NewsVideoList>data;
  }
  return [];
};
/**
 * @description 获取文章
 * @returns
 */
export const getNews = async () => {
  // 新闻数据
  const data = await newsList();
  if (data) {
    return <NewsVideoList>data;
  }
  return [];
};

export default handleWatch;