import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import TimeGraphController, { Period } from "./TimeGraphController";
import { processTimeSeries, TimeResolution, TimeSeries, TimeSeriesRaw } from "../gqlTypes";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import { CircleXIcon } from "lucide-solid";
import {
    Axis,
    AxisCursor,
    AxisGrid,
    AxisLabel,
    AxisTooltip,
    AxisValueLine,
    Bar,
    Chart,
} from "solid-charts";
import { ticks } from "d3-array";
import { boardColor, formatDuration } from "../format";
import { useAppData } from "../contexts/appDataContext";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const dayFormat = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
});

const monthFormat = new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: timezone,
});

const dayLongFormat = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: timezone,
});

const monthLongFormat = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: timezone,
});

export default function TimeGraph() {
    const [appData] = useAppData();
    const [loading, setLoading] = createSignal<"yes" | "no" | "error">("yes");
    const [period, setPeriod] = createSignal<Period>("THIS_WEEK");
    const [timeSummary, setTimeSummary] = createSignal<TimeSeries>({} as TimeSeries);
    const { addAlert } = useAlert();

    function getQueryParams(period: Period) {
        const now = new Date();
        const toDate = now.toISOString();

        const daysAgo = (n: number) =>
            new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);

        if (period == "THIS_WEEK") {
            return { resolution: "DAY", fromDate: daysAgo(6).toISOString(), toDate } as const;
        } else if (period == "THIS_MONTH") {
            return { resolution: "DAY", fromDate: daysAgo(29).toISOString(), toDate } as const;
        } else {
            const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            return { resolution: "MONTH", fromDate: from.toISOString(), toDate } as const;
        }
    }

    async function fetchTimeSummary(params: {
        resolution: TimeResolution;
        fromDate: string;
        toDate: string;
    }) {
        setLoading("yes");

        const result = await gqlClient.query<{ timeSummary: TimeSeriesRaw }>(
            gql`
                query GetTimeSummary(
                    $resolution: TimeResolution!
                    $fromDate: DateTime!
                    $toDate: DateTime!
                    $timezone: String
                ) {
                    timeSummary(
                        resolution: $resolution
                        fromDate: $fromDate
                        toDate: $toDate
                        timezone: $timezone
                    ) {
                        resolution
                        values {
                            start
                            values {
                                boardId
                                value
                            }
                        }
                    }
                }
            `,
            { ...params, timezone }
        );

        if (handleAuthError(result.error)) {
            addAlert({
                type: "error",
                title: "Something went wrong",
                content: "Try again later.",
                icon: CircleXIcon,
            });
            setLoading("error");
            return;
        }

        setTimeSummary(processTimeSeries(result.data!.timeSummary));
        setLoading("no");
    }

    createEffect(() => {
        fetchTimeSummary(getQueryParams(period()));
    });

    onMount(() => {
        fetchTimeSummary(getQueryParams(period()));
    });

    const total = () =>
        timeSummary().values.reduce((acc, e) => acc + e.values.reduce((a, v) => a + v.value, 0), 0);

    const average = () => {
        const { values } = timeSummary();
        return values.length ? Math.round(total() / values.length) : 0;
    };

    const activeAverage = () => {
        const active = timeSummary().values.filter(
            e => e.values.reduce((a, v) => a + v.value, 0) > 0
        );

        return active.length
            ? Math.round(
                  active.reduce((acc, e) => acc + e.values.reduce((a, v) => a + v.value, 0), 0) /
                      active.length
              )
            : 0;
    };

    const boardIds = () => {
        const ids = new Set<number | null>();
        for (const e of timeSummary().values) {
            for (const v of e.values) {
                ids.add(v.boardId);
            }
        }
        return [...ids].sort((a, b) => {
            if (a === b) return 0;
            if (a === null) return 1;
            if (b === null) return -1;
            return a - b;
        });
    };

    const chartData = () => {
        const { values, resolution } = timeSummary();
        const format = resolution == "MONTH" ? monthFormat : dayFormat;
        const ids = boardIds();

        return values.map(({ start, values }) => {
            const item: Record<string, any> = {
                xAxis: format.format(start),
                label: (resolution == "MONTH" ? monthLongFormat : dayLongFormat).format(start),
            };

            for (const id of ids) {
                item[`board_${id ?? "none"}`] = 0;
            }

            for (const v of values) {
                item[`board_${v.boardId ?? "none"}`] = v.value;
            }

            return item;
        });
    };

    const yTicks = () => {
        const max = Math.max(
            0,
            ...timeSummary().values.map(e => e.values.reduce((sum, v) => sum + v.value, 0))
        );
        return ticks(0, max, 4);
    };

    return (
        <div class="flex flex-col items-center">
            <Show when={loading() == "no"}>
                <div class="flex items-center gap-3">
                    <h3 class="text-xl">Time logged</h3>
                    <span class="text-base-content/60">{formatDuration(total())} total</span>
                </div>
                <div class="h-62.5 text-sm w-125 m-6 [&_svg]:overflow-visible">
                    <Chart data={chartData()}>
                        <Axis axis="y" position="left" tickValues={yTicks()}>
                            <AxisLabel format={(v: number) => formatDuration(v)} />
                            <AxisGrid class="opacity-20" />
                        </Axis>

                        <Axis axis="y" position="right" tickValues={[average()]}>
                            <AxisLabel
                                class="fill-primary"
                                format={(v: number) => formatDuration(v)}
                            />
                            <AxisValueLine
                                value={average()}
                                class="stroke-primary"
                                stroke-width={2}
                                stroke-dasharray="6,4"
                            />
                        </Axis>

                        <Show when={activeAverage() !== average()}>
                            <Axis axis="y" position="right" tickValues={[activeAverage()]}>
                                <AxisLabel
                                    class="fill-accent"
                                    format={(v: number) => formatDuration(v)}
                                />
                                <AxisValueLine
                                    value={activeAverage()}
                                    class="stroke-accent"
                                    stroke-width={2}
                                    stroke-dasharray="2,4"
                                />
                            </Axis>
                        </Show>

                        <For each={boardIds()}>
                            {boardId => (
                                <Bar
                                    dataKey={`board_${boardId ?? "none"}`}
                                    fill={boardColor(boardId)}
                                    stackId="what"
                                />
                            )}
                        </For>

                        <Axis axis="x" position="bottom" dataKey="xAxis">
                            <AxisLabel />
                            <AxisCursor stroke-dasharray="10,10" stroke-width={2} />
                            <AxisTooltip class="rounded-md overflow-hidden shadow-sm border bg-base-200">
                                {tooltip => {
                                    // Terrible
                                    const boardEntries = Object.entries(tooltip.data)
                                        .filter(
                                            ([k, v]) =>
                                                k.startsWith("board_") &&
                                                typeof v === "number" &&
                                                v > 0
                                        )
                                        .map(([k, v]) => {
                                            let b = k.replace("board_", "");

                                            return {
                                                boardId: b == "none" ? null : parseInt(b),
                                                value: v as number,
                                            };
                                        })
                                        .sort((a, b) => b.value - a.value);

                                    return (
                                        <div class="p-2 flex flex-col gap-1.5">
                                            <div class="px-2 font-medium">
                                                <p>{tooltip.data.label}</p>
                                            </div>
                                            <For each={boardEntries}>
                                                {entry => (
                                                    <div class="flex items-center px-2 gap-2 text-xs">
                                                        <span
                                                            class="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{
                                                                "background-color": boardColor(
                                                                    entry.boardId
                                                                ),
                                                            }}
                                                        />
                                                        <p class="grow">
                                                            {entry.boardId == null
                                                                ? "Unknown board"
                                                                : (appData.boards.get(
                                                                      entry.boardId
                                                                  ) ?? "Unknown board")}
                                                        </p>
                                                        <p class="font-medium">
                                                            {formatDuration(entry.value)}
                                                        </p>
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    );
                                }}
                            </AxisTooltip>
                        </Axis>
                    </Chart>
                </div>
                <TimeGraphController period={period} setPeriod={setPeriod} />
            </Show>
        </div>
    );
}
