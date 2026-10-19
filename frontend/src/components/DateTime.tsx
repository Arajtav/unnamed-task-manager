import { format, subWeeks, isBefore } from "date-fns";

export default function DateTime(props: {
    datetime: Date;
    imprecise?: boolean;
    seconds?: boolean;
}) {
    const old = isBefore(props.datetime, subWeeks(new Date(), 2));
    const fullValue = format(
        props.datetime,
        props.seconds ? "MM / dd / yyyy, hh:mm:ss a" : "MM / dd / yyyy, hh:mm a"
    );
    const shortValue = format(props.datetime, "MM / dd / yyyy");

    return (
        <div title={props.imprecise && old ? fullValue : undefined}>
            {props.imprecise && old ? shortValue : fullValue}
        </div>
    );
}
