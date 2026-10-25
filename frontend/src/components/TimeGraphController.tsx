import { Accessor, Setter } from "solid-js";

export type Period = "THIS_WEEK" | "THIS_MONTH" | "LAST_12_MONTHS";

export default function TimeGraphController(props: {
    period: Accessor<Period>;
    setPeriod: Setter<Period>;
}) {
    return (
        <div class="join join-horizontal">
            <input
                type="radio"
                name="time-period"
                class="btn join-item"
                aria-label="This week"
                checked={props.period() === "THIS_WEEK"}
                onInput={() => props.setPeriod("THIS_WEEK")}
            />
            <input
                type="radio"
                name="time-period"
                class="btn join-item"
                aria-label="This month"
                checked={props.period() === "THIS_MONTH"}
                onInput={() => props.setPeriod("THIS_MONTH")}
            />
            <input
                type="radio"
                name="time-period"
                class="btn join-item"
                aria-label="Last 12 months"
                checked={props.period() === "LAST_12_MONTHS"}
                onInput={() => props.setPeriod("LAST_12_MONTHS")}
            />
        </div>
    );
}
