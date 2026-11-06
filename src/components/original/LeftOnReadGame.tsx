"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { dexProgress } from "@/lib/left-on-read/dex";
import type { EdEnding } from "@/lib/left-on-read/ed";
import { advance, createRun, settleRun, type GameAction, type GameEvent, type RunState } from "@/lib/left-on-read/game";
import { generateGirl } from "@/lib/left-on-read/girl";
import { NOODLES } from "@/lib/left-on-read/meals";
import { chatTranscript, comebackChat, dueDateChat, visibleChats } from "@/lib/left-on-read/story";
import { useSettings } from "@/lib/settings/SettingsContext";
import PortraitFrame from "./PortraitFrame";
import { commitSave, getSaveSnapshot, getServerSaveSnapshot, subscribeSave } from "./saveStore";
import { ChatList, ChatRoom, ComebackScreen, EndingScreen, type EndingInfo } from "./screens/ChatScreens";
import { DateScreen } from "./screens/DateScreen";
import { DayScreen, PaydayScreen } from "./screens/DayScreen";
import { DexScreen } from "./screens/DexScreen";
import { EdScreen } from "./screens/EdScreen";
import { EveningScreen, MealScreen, type MealNote } from "./screens/EveningScreen";
import { GraduationScreen } from "./screens/GraduationScreen";
import IntroScreen from "./screens/IntroScreen";
import { LadybugScreen, type LadybugEntry } from "./screens/LadybugScreen";
import { MatchScreen } from "./screens/MatchScreen";
import MenuScreen from "./screens/MenuScreen";
import { NightScreen } from "./screens/NightScreen";
import { PhonePickupScreen } from "./screens/PhonePickupScreen";
import { SwipeScreen } from "./screens/SwipeScreen";
import { TrueEndingScreen } from "./screens/TrueEndingScreen";

type Screen = "menu" | "intro" | "game" | "dex" | "graduation" | "ladybug" | "trueEnding" | "ed";

/** 開場看完要去哪裡：新遊戲接著玩，重看就回選單 */
type AfterIntro = "game" | "menu";

const OPENER_TOAST = "訊息送出了。她會看到的。大概。";

export default function LeftOnReadGame() {
  const save = useSyncExternalStore(subscribeSave, getSaveSnapshot, getServerSaveSnapshot);
  const { settings } = useSettings();

  // 初始畫面固定 menu，依存檔而定的內容等 ready 才出現，避免水合不一致
  const [screen, setScreen] = useState<Screen>("menu");
  const [afterIntro, setAfterIntro] = useState<AfterIntro>("menu");
  const [graduationFrom, setGraduationFrom] = useState<Screen>("menu");
  /** null：沒開手機；"list"：列表；數字：聊天室 */
  const [phone, setPhone] = useState<"list" | number | null>(null);
  const [ending, setEnding] = useState<EndingInfo | null>(null);
  const [mealNote, setMealNote] = useState<MealNote | null>(null);
  const [hobbyNote, setHobbyNote] = useState<string | null>(null);
  const [hobbyKind, setHobbyKind] = useState<null | "solo" | "games">(null);
  /** 打開 Swipy 前的拿起手機轉場 */
  const [pickingUpPhone, setPickingUpPhone] = useState(false);
  /** 正在約會畫面上；約會走完才扣錢，中途關掉不會損失 */
  const [onDate, setOnDate] = useState(false);
  const [graduationDue, setGraduationDue] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** 從聊天室走進瓢蟲結局時，把聊天紀錄帶過去；從圖鑑重看就沒有 */
  const [ladybugEntry, setLadybugEntry] = useState<LadybugEntry | null>(null);
  /** 這段結局看完要播哪個片尾；只有真的走到結局才有，從圖鑑重看是 null */
  const [edEnding, setEdEnding] = useState<EdEnding | null>(null);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  const dispatch = useCallback((action: GameAction): GameEvent[] => {
    const { run, meta } = getSaveSnapshot();
    if (!run) return [];
    const result = advance(run, meta.dex, action);
    if (result.run === run) return [];
    // 結局和清掉這一局寫在同一次存檔，中間不會留下還能繼續的存檔
    commitSave(settleRun(result), { ...meta, dex: result.dex });
    return result.events;
  }, []);

  // ---------- 流程 ----------

  const startNewGame = () => {
    // 開場音樂要在使用者手勢裡解鎖音訊
    void audioManager.resume();
    audioManager.pop();
    const { meta } = getSaveSnapshot();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    commitSave(createRun(seed), meta);
    setPhone(null);
    setEnding(null);
    setMealNote(null);
    setHobbyNote(null);
    setHobbyKind(null);
    setPickingUpPhone(false);
    setOnDate(false);
    if (meta.introSeen) {
      setScreen("game");
    } else {
      setAfterIntro("game");
      setScreen("intro");
    }
  };

  const replayIntro = () => {
    void audioManager.resume();
    audioManager.pop();
    setAfterIntro("menu");
    setScreen("intro");
  };

  const finishIntro = useCallback(() => {
    const { run, meta } = getSaveSnapshot();
    if (!meta.introSeen) commitSave(run, { ...meta, introSeen: true });
    setScreen(afterIntro);
  }, [afterIntro]);

  const finishGraduation = (next: Screen) => {
    const { run, meta } = getSaveSnapshot();
    if (!meta.graduationSeen) commitSave(run, { ...meta, graduationSeen: true });
    setScreen(next === "game" && !run ? "menu" : next);
  };

  // ---------- 遊戲動作 ----------

  const reply = (chatId: number, choice: number, panelHeight?: number) => {
    audioManager.bubble();
    const sourceChat = save.run?.chats.find((c) => c.id === chatId);
    const girlSeed = sourceChat?.girlSeed;
    // 走到結局後聊天會被收掉，紀錄要先留下來
    const girl = sourceChat ? generateGirl(sourceChat.girlSeed) : null;
    const history = sourceChat && girl && save.run ? chatTranscript(sourceChat, girl, save.run.dayIndex) : [];
    const events = dispatch({ type: "reply", chatId, choice });
    // 假失敗：演得和一般失敗一樣，但圖鑑和聊天都沒有動
    const fake = events.find((e) => e.type === "fakeEnding");
    if (fake?.type === "fakeEnding" && girlSeed !== undefined) {
      audioManager.wrong();
      const { collected, total } = dexProgress(getSaveSnapshot().meta.dex);
      setEnding({
        storyId: fake.storyId,
        narration: fake.narration,
        paid: 0,
        firstTime: false,
        antiFraud: false,
        girl: generateGirl(girlSeed),
        collected,
        total,
      });
      return;
    }
    if (!events.some((e) => e.type === "gameEnding")) return;
    setPhone(null);
    // 最後一句是 1h2s 那題，結局的第一段會接著顯示
    setLadybugEntry(girl ? { girl, history: history.slice(0, -1), panelHeight } : null);
    setEdEnding("ladybug");
    setScreen("ladybug");
  };

  const closeChat = (chatId: number) => {
    const girlSeed = save.run?.chats.find((c) => c.id === chatId)?.girlSeed;
    const events = dispatch({ type: "closeChat", chatId });
    const ended = events.find((e) => e.type === "chatEnded");
    if (!ended || ended.type !== "chatEnded" || girlSeed === undefined) return;
    audioManager.wrong();
    const { collected, total } = dexProgress(getSaveSnapshot().meta.dex);
    setEnding({
      storyId: ended.storyId,
      narration: ended.narration,
      paid: ended.paid,
      firstTime: ended.firstTime,
      antiFraud: ended.antiFraud,
      girl: generateGirl(girlSeed),
      collected,
      total,
    });
    if (events.some((e) => e.type === "dexCompleted")) setGraduationDue(true);
  };

  const finishDate = (choice: number) => {
    const events = dispatch({ type: "goOnDate", choice });
    setOnDate(false);
    setPhone(null);
    if (!events.some((e) => e.type === "gameEnding")) return;
    setEdEnding("true");
    setScreen("trueEnding");
  };

  const finishEndingBeats = () => setScreen(edEnding ? "ed" : "menu");

  const finishEd = useCallback(() => {
    setEdEnding(null);
    setScreen("menu");
  }, []);

  const endingDoneLabel = edEnding ? "繼續" : undefined;

  const closeEnding = () => {
    setEnding(null);
    const { run } = getSaveSnapshot();
    const remaining = run ? visibleChats(run.chats, run.dayIndex).length : 0;
    setPhone(remaining > 0 ? "list" : null);
    if (graduationDue) {
      setGraduationDue(false);
      setPhone(null);
      setGraduationFrom("game");
      setScreen("graduation");
    }
  };

  const eatOut = () => {
    const meal = dispatch({ type: "eatOut" }).find((e) => e.type === "meal");
    if (meal?.type === "meal") {
      setMealNote({ name: meal.name, price: meal.price, narration: meal.narration, dish: meal.dish, home: false });
    }
  };

  const goHome = () => {
    dispatch({ type: "goHome" });
    setMealNote({ name: NOODLES.name, price: NOODLES.price, narration: NOODLES.narration, dish: NOODLES.dish, home: true });
  };

  const doHobby = (type: "jerkOff" | "playGames") => {
    const ev = dispatch({ type }).find((e) => e.type === "hobby");
    if (ev?.type === "hobby") {
      setHobbyNote(ev.narration);
      setHobbyKind(ev.kind);
    }
  };

  // ---------- 畫面 ----------

  /** 手機開著的時候蓋住當下的畫面，白天和晚上共用；沒開就回傳 null */
  const renderPhone = (run: RunState) => {
    const chat = typeof phone === "number" ? run.chats.find((c) => c.id === phone) : undefined;
    if (chat) {
      return (
        <ChatRoom
          run={run}
          chat={chat}
          onBack={() => {
            audioManager.pop();
            setPhone("list");
          }}
          onReply={(choice, panelHeight) => reply(chat.id, choice, panelHeight)}
          onFinish={() => closeChat(chat.id)}
        />
      );
    }
    if (phone !== null && visibleChats(run.chats, run.dayIndex).length > 0) {
      return (
        <ChatList
          run={run}
          onOpen={(id) => {
            audioManager.pop();
            setPhone(id);
          }}
          onClose={() => setPhone(null)}
        />
      );
    }
    return null;
  };

  const renderGame = () => {
    const { run } = save;
    if (!run) return null;
    const toMenu = () => setScreen("menu");

    if (ending) return <EndingScreen ending={ending} onClose={closeEnding} />;
    if (mealNote) {
      return <MealScreen run={run} note={mealNote} onMenu={toMenu} onDone={() => setMealNote(null)} />;
    }
    if (pickingUpPhone) {
      return (
        <PhonePickupScreen
          onDone={() => {
            setPickingUpPhone(false);
            dispatch({ type: "openApp" });
          }}
        />
      );
    }

    switch (run.phase) {
      case "payday":
        return (
          <PaydayScreen
            run={run}
            onMenu={toMenu}
            onAck={() => {
              audioManager.chime();
              dispatch({ type: "ackPayday" });
            }}
          />
        );
      case "daytime": {
        const returning = comebackChat(run.chats, run.dayIndex);
        if (returning) {
          return (
            <ComebackScreen
              chat={returning}
              onReply={(choice) => {
                reply(returning.id, choice);
                // 回完留在聊天室，她那句和冠宇的回覆都還看得到
                setPhone(returning.id);
              }}
            />
          );
        }
        const dateChat = onDate ? dueDateChat(run.chats, run.dayIndex) : null;
        if (dateChat) return <DateScreen chat={dateChat} onDone={finishDate} />;
        const phoneScreen = renderPhone(run);
        if (phoneScreen) return phoneScreen;
        return (
          <DayScreen
            run={run}
            onMenu={toMenu}
            onOpenChats={() => setPhone("list")}
            onGoDate={() => setOnDate(true)}
            onEndDay={() => {
              setPhone(null);
              dispatch({ type: "endDaytime" });
            }}
          />
        );
      }
      case "evening":
        return <EveningScreen run={run} onMenu={toMenu} onEatOut={eatOut} onGoHome={goHome} />;
      case "night":
      case "nightDone": {
        const phoneScreen = renderPhone(run);
        if (phoneScreen) return phoneScreen;
        return (
          <NightScreen
            key={run.dayIndex}
            run={run}
            onMenu={toMenu}
            onOpenApp={() => {
              setHobbyNote(null);
              setHobbyKind(null);
              setPickingUpPhone(true);
            }}
            onOpenChats={() => {
              setHobbyNote(null);
              setHobbyKind(null);
              setPhone("list");
            }}
            onJerkOff={() => doHobby("jerkOff")}
            onPlayGames={() => doHobby("playGames")}
            onSleep={() => {
              setHobbyNote(null);
              setHobbyKind(null);
              dispatch({ type: "sleep" });
            }}
            hobbyNote={hobbyNote}
            hobbyKind={hobbyKind}
          />
        );
      }
      case "swiping":
        return (
          <SwipeScreen
            run={run}
            dex={save.meta.dex}
            onSwipe={(dir) => {
              const events = dispatch({ type: "swipe", dir });
              if (events.some((e) => e.type === "matched")) audioManager.success();
            }}
            onQuit={() => dispatch({ type: "quitApp" })}
          />
        );
      case "matched":
        return run.pendingMatchSeed === null ? null : (
          <MatchScreen
            girlSeed={run.pendingMatchSeed}
            onChoose={(opener) => {
              audioManager.bubble();
              dispatch({ type: "chooseOpener", opener });
              setToast(OPENER_TOAST);
            }}
          />
        );
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case "intro":
        return <IntroScreen onDone={finishIntro} />;
      case "dex":
        return (
          <DexScreen
            dex={save.meta.dex}
            onBack={() => setScreen("menu")}
            onLadybug={() => {
              setLadybugEntry(null);
              setEdEnding(null);
              setScreen("ladybug");
            }}
            onTrueEnding={() => {
              setEdEnding(null);
              setScreen("trueEnding");
            }}
          />
        );
      case "ladybug":
        return <LadybugScreen entry={ladybugEntry} doneLabel={endingDoneLabel} onDone={finishEndingBeats} />;
      case "trueEnding":
        return <TrueEndingScreen doneLabel={endingDoneLabel} onDone={finishEndingBeats} />;
      case "ed":
        if (edEnding) return <EdScreen ending={edEnding} onDone={finishEd} />;
        break;
      case "graduation":
        return (
          <GraduationScreen
            dex={save.meta.dex}
            dayIndex={save.run?.dayIndex ?? null}
            onContinue={() => finishGraduation(graduationFrom)}
            onMenu={() => finishGraduation("menu")}
          />
        );
      case "game":
        if (save.run) return renderGame();
        break;
      case "menu":
        break;
    }
    return (
      <MenuScreen
        save={save}
        onContinue={() => setScreen("game")}
        onNewGame={startNewGame}
        onDex={() => setScreen("dex")}
        onIntro={replayIntro}
        onGraduation={() => {
          setGraduationFrom("menu");
          setScreen("graduation");
        }}
      />
    );
  };

  return (
    <PortraitFrame>
      {renderScreen()}
      {toast ? (
        <div
          key={toast}
          onAnimationEnd={() => setToast(null)}
          className="pointer-events-none absolute inset-x-4 top-[84px] z-30 border-[3px] border-black bg-[#f4efe0] px-3 py-2 text-center text-sm text-[#20203c] shadow-[4px_4px_0_#000]"
          style={{ animation: "lor-toast 2400ms linear both" }}
        >
          {toast}
        </div>
      ) : null}
    </PortraitFrame>
  );
}
