/**
 * 晚餐。每道都附一句旁白，吃的是飯，配的是一個人。
 */

import { NOODLE_PRICE } from "./constants.ts";

export interface Meal {
  id: string;
  name: string;
  price: number;
  narration: string;
}

export const MEALS: readonly Meal[] = [
  {
    id: "braised-pork",
    name: "滷肉飯加滷蛋",
    price: 100,
    narration: "老闆問我一個人嗎。我說對。他把靠牆的位子指給我。",
  },
  {
    id: "dumplings",
    name: "水餃十二顆",
    price: 108,
    narration: "老闆娘朝廚房喊：「十二顆內用，一個人！」全店都知道了。",
  },
  {
    id: "buffet",
    name: "自助餐",
    price: 115,
    narration: "阿姨問我飯要不要多一點。我說好。這是我今天跟人講過最長的對話。",
  },
  {
    id: "fried-rice",
    name: "蝦仁炒飯",
    price: 120,
    narration: "炒飯來得很快，我吃得更快。回去的路上，時間還剩很多。",
  },
  {
    id: "udon",
    name: "鍋燒意麵",
    price: 110,
    narration: "牆上的電視在播新聞。老闆跟我一起看。我們對這個世界都沒有意見。",
  },
  {
    id: "chicken-bento",
    name: "雞腿便當",
    price: 125,
    narration: "媽傳訊息問我吃了沒。我拍了雞腿給她看，她說太油。今天只有她回我。",
  },
  {
    id: "curry",
    name: "咖哩飯",
    price: 150,
    narration: "菜單上寫「雙人套餐第二份半價」。我點了一份全價的。",
  },
  {
    id: "beef-noodle",
    name: "牛肉麵",
    price: 180,
    narration: "隔壁桌在討論週末要去哪。我的週末也排好了，要洗衣服。",
  },
  {
    id: "fast-food",
    name: "速食套餐",
    price: 169,
    narration: "店員問我：「這樣就好了嗎？」我想了一下這個問題，然後說好。",
  },
  {
    id: "set-meal",
    name: "烤魚定食",
    price: 210,
    narration: "服務生把對面那副碗筷收走了。她的動作很輕，好像怕吵醒什麼。",
  },
  {
    id: "hotpot",
    name: "一人小火鍋",
    price: 230,
    narration: "湯滾了。對面的椅子上放著我的背包，它今天也沒有說話。",
  },
  {
    id: "ramen",
    name: "豚骨拉麵",
    price: 260,
    narration: "吧檯座位是人類對一個人吃飯最溫柔的發明。左右都有人，但沒有人看我。",
  },
];

export const NOODLES: Meal = {
  id: "noodles",
  name: "泡麵",
  price: NOODLE_PRICE,
  narration: "泡麵要等三分鐘。我站在流理台前面等。這三分鐘是今天最確定會有結果的事。",
};
