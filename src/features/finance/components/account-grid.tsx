import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  measure,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { Account } from "@/features/finance/types";

const GRID_COLUMNS = 2;
const GRID_ROWS = 2;
const ITEMS_PER_PAGE = GRID_COLUMNS * GRID_ROWS;
const PICKUP_DELAY_MS = 300;
const AUTOSCROLL_EDGE = 56;
const AUTOSCROLL_SPEED = 0.14;
const SPRING_CONFIG = { damping: 22, mass: 0.5, stiffness: 220 };

export interface AccountGridLayout {
  cardHeight: number;
  cardWidth: number;
  columnGap: number;
  pageGap: number;
  pageWidth: number;
  rowGap: number;
}

interface GridSharedValues {
  contentOriginX: SharedValue<number>;
  contentOriginY: SharedValue<number>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  draggingId: SharedValue<string | null>;
  fingerX: SharedValue<number>;
  fingerY: SharedValue<number>;
  orderIds: SharedValue<string[]>;
  ready: SharedValue<boolean>;
  scrollX: SharedValue<number>;
  touchOffsetX: SharedValue<number>;
  touchOffsetY: SharedValue<number>;
  viewportLeft: SharedValue<number>;
  viewportRight: SharedValue<number>;
}

interface Props {
  accounts: Account[];
  carouselWidth: number;
  horizontalPadding: number;
  layout: AccountGridLayout;
  onDraggingChange?: (dragging: boolean) => void;
  onPressAccount: (account: Account) => void;
  onReorder: (ids: string[]) => void;
  renderAccount: (account: Account) => ReactNode;
  renderAddAccount: () => ReactNode;
}

function slotPosition(index: number, layout: AccountGridLayout) {
  "worklet";
  const pageIndex = Math.floor(index / ITEMS_PER_PAGE);
  const within = index % ITEMS_PER_PAGE;
  const column = Math.floor(within / GRID_ROWS);
  const row = within % GRID_ROWS;
  return {
    x:
      pageIndex * (layout.pageWidth + layout.pageGap) +
      column * (layout.cardWidth + layout.columnGap),
    y: row * (layout.cardHeight + layout.rowGap),
  };
}

const styles = StyleSheet.create({
  item: {
    left: 0,
    position: "absolute",
    top: 0,
  },
});

interface DraggableAccountProps {
  account: Account;
  children: ReactNode;
  contentRef: ReturnType<typeof useAnimatedRef<Animated.View>>;
  layout: AccountGridLayout;
  onDragEnd: (ids: string[]) => void;
  onDragStart: () => void;
  onPressAccount: (account: Account) => void;
  scrollRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  shared: GridSharedValues;
  updateDrag: (absoluteX: number, absoluteY: number) => void;
}

function DraggableAccount({
  account,
  children,
  contentRef,
  layout,
  onDragEnd,
  onDragStart,
  onPressAccount,
  scrollRef,
  shared,
  updateDrag,
}: DraggableAccountProps) {
  const { id } = account;

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(300)
      .maxDistance(12)
      .onEnd((_event, success) => {
        "worklet";
        if (success) {
          scheduleOnRN(onPressAccount, account);
        }
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(PICKUP_DELAY_MS)
      .onStart((event) => {
        "worklet";
        const index = shared.orderIds.value.indexOf(id);
        if (index === -1) {
          return;
        }
        const start = slotPosition(index, layout);
        shared.draggingId.value = id;
        shared.dragX.value = start.x;
        shared.dragY.value = start.y;
        shared.touchOffsetX.value = event.x;
        shared.touchOffsetY.value = event.y;
        shared.fingerX.value = event.absoluteX;
        shared.fingerY.value = event.absoluteY;

        const content = measure(contentRef);
        if (content) {
          shared.contentOriginX.value = content.pageX + shared.scrollX.value;
          shared.contentOriginY.value = content.pageY;
        }
        const viewport = measure(scrollRef);
        if (viewport) {
          shared.viewportLeft.value = viewport.pageX;
          shared.viewportRight.value = viewport.pageX + viewport.width;
        }

        scheduleOnRN(onDragStart);
      })
      .onUpdate((event) => {
        "worklet";
        if (shared.draggingId.value !== id) {
          return;
        }
        shared.fingerX.value = event.absoluteX;
        shared.fingerY.value = event.absoluteY;
        updateDrag(event.absoluteX, event.absoluteY);
      })
      .onFinalize(() => {
        "worklet";
        if (shared.draggingId.value !== id) {
          return;
        }
        const stride = layout.pageWidth + layout.pageGap;
        const page = Math.round(shared.scrollX.value / stride);
        shared.draggingId.value = null;
        scrollTo(scrollRef, page * stride, 0, true);
        scheduleOnRN(onDragEnd, [...shared.orderIds.value]);
      });

    return Gesture.Exclusive(pan, tap);
  }, [
    account,
    contentRef,
    id,
    layout,
    onDragEnd,
    onDragStart,
    onPressAccount,
    scrollRef,
    shared,
    updateDrag,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const index = shared.orderIds.value.indexOf(id);
    const target = slotPosition(index === -1 ? 0 : index, layout);

    if (shared.draggingId.value === id) {
      return {
        elevation: 8,
        transform: [
          { translateX: shared.dragX.value },
          { translateY: shared.dragY.value },
          { scale: 1.04 },
        ],
        zIndex: 30,
      };
    }

    return {
      elevation: 0,
      transform: [
        {
          translateX: shared.ready.value
            ? withSpring(target.x, SPRING_CONFIG)
            : target.x,
        },
        {
          translateY: shared.ready.value
            ? withSpring(target.y, SPRING_CONFIG)
            : target.y,
        },
        { scale: 1 },
      ],
      zIndex: 0,
    };
  }, [id, layout, shared]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityLabel={account.name}
        accessibilityRole="button"
        onAccessibilityTap={() => {
          onPressAccount(account);
        }}
        style={[
          styles.item,
          {
            height: layout.cardHeight,
            width: layout.cardWidth,
          },
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

function AddAccountSlot({
  children,
  layout,
  shared,
}: {
  children: ReactNode;
  layout: AccountGridLayout;
  shared: GridSharedValues;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const target = slotPosition(shared.orderIds.value.length, layout);
    return {
      transform: [
        {
          translateX: shared.ready.value
            ? withSpring(target.x, SPRING_CONFIG)
            : target.x,
        },
        {
          translateY: shared.ready.value
            ? withSpring(target.y, SPRING_CONFIG)
            : target.y,
        },
      ],
    };
  }, [layout, shared]);

  return (
    <Animated.View
      style={[
        styles.item,
        {
          height: layout.cardHeight,
          width: layout.cardWidth,
        },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function AccountGrid({
  accounts,
  carouselWidth,
  horizontalPadding,
  layout,
  onDraggingChange,
  onPressAccount,
  onReorder,
  renderAccount,
  renderAddAccount,
}: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const contentRef = useAnimatedRef<Animated.View>();
  const scrollX = useSharedValue(0);
  const orderIds = useSharedValue<string[]>(accounts.map((a) => a.id));
  const ready = useSharedValue(false);
  const draggingId = useSharedValue<string | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const touchOffsetX = useSharedValue(0);
  const touchOffsetY = useSharedValue(0);
  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const contentOriginX = useSharedValue(0);
  const contentOriginY = useSharedValue(0);
  const viewportLeft = useSharedValue(0);
  const viewportRight = useSharedValue(0);
  const contentWidth = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const shared = useMemo<GridSharedValues>(
    () => ({
      contentOriginX,
      contentOriginY,
      dragX,
      dragY,
      draggingId,
      fingerX,
      fingerY,
      orderIds,
      ready,
      scrollX,
      touchOffsetX,
      touchOffsetY,
      viewportLeft,
      viewportRight,
    }),
    [
      contentOriginX,
      contentOriginY,
      dragX,
      dragY,
      draggingId,
      fingerX,
      fingerY,
      orderIds,
      ready,
      scrollX,
      touchOffsetX,
      touchOffsetY,
      viewportLeft,
      viewportRight,
    ]
  );

  useEffect(() => {
    if (draggingId.value === null) {
      orderIds.value = accounts.map((account) => account.id);
    }
  }, [accounts, draggingId, orderIds]);

  useEffect(() => {
    ready.value = true;
  }, [ready]);

  const updateDrag = useCallback(
    (absoluteX: number, absoluteY: number) => {
      "worklet";
      const draggedId = draggingId.value;
      if (draggedId === null) {
        return;
      }

      const contentX = absoluteX - contentOriginX.value + scrollX.value;
      const contentY = absoluteY - contentOriginY.value;
      dragX.value = contentX - touchOffsetX.value;
      dragY.value = contentY - touchOffsetY.value;

      const stride = layout.pageWidth + layout.pageGap;
      let pageIndex = Math.floor(contentX / stride);
      if (pageIndex < 0) {
        pageIndex = 0;
      }
      const withinPageX = contentX - pageIndex * stride;
      let column = Math.floor(
        withinPageX / (layout.cardWidth + layout.columnGap)
      );
      let row = Math.floor(contentY / (layout.cardHeight + layout.rowGap));
      if (column < 0) {
        column = 0;
      } else if (column > GRID_COLUMNS - 1) {
        column = GRID_COLUMNS - 1;
      }
      if (row < 0) {
        row = 0;
      } else if (row > GRID_ROWS - 1) {
        row = GRID_ROWS - 1;
      }

      const count = orderIds.value.length;
      if (count === 0) {
        return;
      }
      let target = pageIndex * ITEMS_PER_PAGE + column * GRID_ROWS + row;
      if (target > count - 1) {
        target = count - 1;
      }

      const from = orderIds.value.indexOf(draggedId);
      if (from === -1 || target === from) {
        return;
      }

      const next = [...orderIds.value];
      next.splice(from, 1);
      next.splice(target, 0, draggedId);
      orderIds.value = next;
    },
    [
      contentOriginX,
      contentOriginY,
      dragX,
      dragY,
      draggingId,
      layout,
      orderIds,
      scrollX,
      touchOffsetX,
      touchOffsetY,
    ]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDraggingChange?.(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      /* empty */
    });
  }, [onDraggingChange]);

  const handleDragEnd = useCallback(
    (ids: string[]) => {
      setIsDragging(false);
      onDraggingChange?.(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        /* empty */
      });
      onReorder(ids);
    },
    [onDraggingChange, onReorder]
  );

  useFrameCallback(() => {
    "worklet";
    if (draggingId.value === null) {
      return;
    }
    const maxScroll = contentWidth.value - viewportWidth.value;
    if (maxScroll <= 0) {
      return;
    }
    const left = viewportLeft.value;
    const right = viewportRight.value;
    const x = fingerX.value;
    let delta = 0;
    if (x < left + AUTOSCROLL_EDGE) {
      delta = -(left + AUTOSCROLL_EDGE - x) * AUTOSCROLL_SPEED;
    } else if (x > right - AUTOSCROLL_EDGE) {
      delta = (x - (right - AUTOSCROLL_EDGE)) * AUTOSCROLL_SPEED;
    }
    if (delta === 0) {
      return;
    }
    let next = scrollX.value + delta;
    if (next < 0) {
      next = 0;
    } else if (next > maxScroll) {
      next = maxScroll;
    }
    if (next === scrollX.value) {
      return;
    }
    scrollX.value = next;
    scrollTo(scrollRef, next, 0, false);
    updateDrag(fingerX.value, fingerY.value);
  });

  const pageCount = Math.ceil((accounts.length + 1) / ITEMS_PER_PAGE);
  const gridWidth =
    pageCount * layout.pageWidth + Math.max(0, pageCount - 1) * layout.pageGap;
  const gridHeight =
    GRID_ROWS * layout.cardHeight + (GRID_ROWS - 1) * layout.rowGap;

  return (
    <Animated.ScrollView
      ref={scrollRef}
      decelerationRate="fast"
      horizontal
      nestedScrollEnabled
      scrollEnabled={!isDragging}
      showsHorizontalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={layout.pageWidth + layout.pageGap}
      contentContainerStyle={{
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding + layout.pageGap,
      }}
      onContentSizeChange={(width) => {
        contentWidth.value = width;
      }}
      onLayout={(event) => {
        viewportWidth.value = event.nativeEvent.layout.width;
      }}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      style={{ marginLeft: -horizontalPadding, width: carouselWidth }}
    >
      <Animated.View
        ref={contentRef}
        style={{ height: gridHeight, width: gridWidth }}
      >
        {accounts.map((account) => (
          <DraggableAccount
            account={account}
            contentRef={contentRef}
            key={account.id}
            layout={layout}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onPressAccount={onPressAccount}
            scrollRef={scrollRef}
            shared={shared}
            updateDrag={updateDrag}
          >
            {renderAccount(account)}
          </DraggableAccount>
        ))}
        <AddAccountSlot layout={layout} shared={shared}>
          {renderAddAccount()}
        </AddAccountSlot>
      </Animated.View>
    </Animated.ScrollView>
  );
}
