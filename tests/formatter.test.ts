import { getFormattedContent, getFormattedStyleKey } from '../src/feature/formatter';
import { Language, Platform } from '../src/types';

describe('getFormattedContent', () => {
  // 空字符串
  test('should return empty string if content is empty', () => {
    const result = getFormattedContent('', Language.EN, 'nodeName', '');
    expect(result).toBe('');
  });

  // 大小写规范
  test('should captestalize the first letter of each word when nodename equals to ForcedCaptestalization', () => {
    const content = 'this is a test for word captestalize and special words are not captestalized';
    const result = getFormattedContent(content, Language.EN, 'Dialog-title', '');
    expect(result).toBe('This is a Test for Word Captestalize and Special Words are Not Captestalized');
  });

  // 大小写规范
  test('should captestalize the first letter of each word when parent node name matches', () => {
    const content = 'this is a test for word captestalize and special words are not captestalized';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '[D] Tag_Avatar_Person');
    expect(result).toBe('This is a Test for Word Captestalize and Special Words are Not Captestalized');
  });

  // 日期格式化-月份缩写
  test('should abbreviate "January" to "Jan"', () => {
    const content = 'January 1, 2022';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '');
    expect(result).toBe('Jan 1, 2022');
  });

  // 日期格式化- 周缩写
  test('should abbreviate "Wednesday, October 11" to "Wed, Oct 11"', () => {
    const content = 'The event is on Wednesday, October 11.';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '');
    expect(result).toBe('The event is on Wed, Oct 11.');
  });

  // 日期格式化- 周缩写
  test('should abbreviate "Wednesday, Oct 11" to "Wed, Oct 11"', () => {
    const content = 'The event is on Wednesday, Oct 11.';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '');
    expect(result).toBe('The event is on Wed, Oct 11.');
  });

  // 日期格式化- 周缩写
  test('should not abbreviate "Wednesday October 11" wtesthout comma', () => {
    const content = 'The event is on Wednesday and the date is October 11.';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '');
    expect(result).toBe('The event is on Wednesday and the date is Oct 11.');
  });

  // 日期格式化-YYYY/MM/DD英文下转化
  test('should convert date format from YYYY/MM/DD to "Month Day, Year"', () => {
    const content = 'The event is on 2022/02/02.';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '');
    expect(result).toBe('The event is on Feb 2, 2022.');
  });

  // 日期格式化
  test('should handle non-English content wtesthout formatting', () => {
    const content = '2022年1月1日';
    const result = getFormattedContent(content, Language.ZH, 'nodeName', '');
    expect(result).toBe('2022年1月1日');
  });

  // 货币格式化
  test('should format currency for English language', () => {
    const content = '¥100';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '');
    expect(result).toBe('$100');
  });

  // 货币格式化
  test('should format currency for Chinese language wtesth space', () => {
    const content = '$ 100';
    const result = getFormattedContent(content, Language.ZH, 'nodeName', '');
    expect(result).toBe('¥ 100');
  });

  // 综合应用测试
  test('should handle both captestalization, date format conversion and currency format conversion', () => {
    const content =
      'The meeting is scheduled for 2022/02/02 and test cost $100. I remember test is on Wednesday, October 11. So I have to get up early on Tuesday.';
    const result = getFormattedContent(content, Language.EN, 'nodeName', '[D] Tag_Avatar_Person');
    expect(result).toBe(
      'The Meeting is Scheduled for Feb 2, 2022 and Test Cost $100. I Remember Test is on Wed, Oct 11. So I Have to Get Up Early on Tuesday.'
    );
  });
});

describe('getFormattedStyleKey', () => {
  test('should return correct styleKey when all parameters are valid - from ZH to ZH', () => {
    const fontName = { family: 'PingFang SC', style: 'Semibold' };
    const fontSize = 24;
    const language = Language.ZH;
    const platform = Platform.Desktop;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('84b11a3514fcc6331fd7b22faaf6b0e1e479a60c');
  });

  test('should return correct styleKey when all parameters are valid - from ZH to EN', () => {
    const fontName = { family: 'PingFang SC', style: 'Regular' };
    const fontSize = 12;
    const language = Language.EN;
    const platform = Platform.Desktop;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('2d7121c34523ead5779a21d8ccdfb215b5c10ac3');
  });
  test('should return correct styleKey when all parameters are valid - from EN to ZH', () => {
    const fontName = { family: 'SF Pro Text', style: 'Semibold' };
    const fontSize = 30;
    const language = Language.ZH;
    const platform = Platform.Desktop;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('baace18851d4410b290e76e4030a6c43894015b7');
  });

  test('should return correct styleKey when all parameters are valid - from Desktop to Mobile', () => {
    const fontName = { family: 'PingFang SC', style: 'Regular' };
    const fontSize = 16;
    const language = Language.ZH;
    const platform = Platform.Mobile;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('a18a512f0c97944421691f6764efd4345d417fc6');
  });

  test('should return empty with unvalid transfrom between platforms', () => {
    const fontName = { family: 'PingFang SC', style: 'Regular' };
    const fontSize = 18;
    const language = Language.ZH;
    const platform = Platform.Mobile;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('');
  });

  test('should return empty with unvalid fontSize - from Mobile to Desktop', () => {
    const fontName = { family: 'PingFang SC', style: 'Medium' };
    const fontSize = 14;
    const language = Language.EN;
    const platform = Platform.Desktop;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('effac6f1285c0efcbcdfd9fac1295bc4fbcf82bb');
  });

  test('should return empty string when parameters are invalid', () => {
    const fontName = { family: '', style: '' };
    const fontSize = 0;
    const language = Language.EN;
    const platform = Platform.Mobile;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('');
  });

  test('should return empty string when no matching style is found', () => {
    const fontName = { family: 'NonExistent', style: 'NonExistent' };
    const fontSize = 16;
    const language = Language.EN;
    const platform = Platform.Mobile;

    const result = getFormattedStyleKey(fontName, fontSize, language, platform);
    expect(result).toBe('');
  });
});
