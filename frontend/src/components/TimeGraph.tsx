import { createEffect, createSignal, onMount, Show } from "solid-js";
import TimeGraphController, { Period } from "./TimeGraphController";
import { processTimeSeries, TimeResolution, TimeSeries, TimeSeriesRaw } from "../gqlTypes";
import { gqlClient } from "../graphql";
import { gql } from "@urql/core";
import { handleAuthError } from "../auth";
import { useAlert } from "../contexts/alertContext";
import { CircleXIcon } from "lucide-solid";
import { Axis, AxisCursor, AxisGrid, AxisLabel, AxisTooltip, Bar, Chart } from "solid-charts";
import { formatDuration } from "../format";

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

export default function TimeGraph() {
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
                            value
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

    function bucketLabel(start: string, resolution: TimeResolution, index: number) {
        const [y, m, d] = new Date(start)
            .toLocaleDateString("en-CA", { timeZone: timezone })
            .split("-")
            .map(Number);

        if (resolution == "MONTH") {
            const date = new Date(Date.UTC(y, m - 1 + index, 1));
            return date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
        }

        const date = new Date(Date.UTC(y, m - 1, d + index));
        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        });
    }

    createEffect(() => {
        fetchTimeSummary(getQueryParams(period()));
    });

    onMount(() => {
        fetchTimeSummary(getQueryParams(period()));
    });

    const total = () => timeSummary().values.reduce((sum, { value }) => sum + value, 0);

    const chartData = () => {
        const { values, resolution } = timeSummary();
        const format = resolution == "MONTH" ? monthFormat : dayFormat;
        return values.map(({ start, value }) => ({
            xAxis: format.format(start),
            duration: value,
        }));
    };

    return (
        <div class="flex flex-col items-center">
            <Show when={loading() == "no"}>
                <div class="flex items-center gap-3">
                    <h3 class="text-xl">Time logged</h3>
                    <span class="text-base-content/60">{formatDuration(total())} total</span>
                </div>
                <div class="h-62.5 text-sm w-125 m-6">
                    <Chart data={chartData()}>
                        <Axis axis="y" position="left">
                            <AxisLabel format={(v: number) => formatDuration(v)} />
                            <AxisGrid class="opacity-20" />
                        </Axis>

                        <Bar dataKey="duration" class="fill-secondary" />

                        <Axis axis="x" position="bottom" dataKey="xAxis">
                            <AxisLabel />
                            <AxisCursor stroke-dasharray="10,10" stroke-width={2} />
                            <AxisTooltip class="rounded-md overflow-hidden shadow-sm border bg-base-200">
                                {tooltip => (
                                    <div class="p-2 flex flex-col gap-2">
                                        <div class="px-2 font-medium">
                                            <p>{tooltip.data.xAxis}</p>
                                        </div>
                                        <div class="flex items-center px-2">
                                            <p class="grow ml-1.5">Time logged</p>
                                            <p class="ml-3">
                                                {formatDuration(tooltip.data.duration)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </AxisTooltip>
                        </Axis>
                    </Chart>
                </div>
                <TimeGraphController period={period} setPeriod={setPeriod} />
            </Show>
        </div>
    );
}
