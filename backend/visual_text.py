from models import VisualAid


def describe_visual(visual: VisualAid) -> str:
    """Render a VisualAid as a short plain-text picture for Word/PDF exports,
    since embedding the live SVG diagram isn't practical in those formats.
    """
    if visual.type == "groups":
        group = "●" * max(visual.param2, 0)
        groups = " | ".join([group] * max(visual.param1, 0)) or "(no groups)"
        return f"Picture: {visual.param1} groups of {visual.param2} -> {groups}"

    if visual.type == "number_line":
        return f"Picture: number line jumping from {visual.param1} to {visual.param2}"

    if visual.type == "pie":
        shaded = "▓" * max(visual.param2, 0)
        unshaded = "░" * max(visual.param1 - visual.param2, 0)
        return f"Picture: {visual.param2} of {visual.param1} parts shaded -> {shaded}{unshaded}"

    if visual.type == "column":
        op = {2: "-", 3: "x"}.get(visual.param3, "+")
        return f"Picture: written sum {visual.param1} {op} {visual.param2}, worked column by column"

    if visual.type == "rectangle":
        unit = f" {visual.label}" if visual.label else ""
        return f"Picture: rectangle {visual.param1}{unit} by {visual.param2}{unit}"

    return ""
