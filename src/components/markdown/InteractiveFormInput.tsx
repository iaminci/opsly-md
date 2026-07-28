"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, type ComponentProps } from "react";

interface InteractiveFormInputProps extends Omit<ComponentProps<"input">, "onToggle"> {
  controlIndex: number;
  interactive: boolean;
  onFormControlToggle?: (controlIndex: number) => void;
}

export function InteractiveFormInput({
  type,
  checked,
  disabled,
  name,
  controlIndex,
  interactive,
  onFormControlToggle,
  className,
  onChange,
  onClick,
  node: _node,
  ...props
}: InteractiveFormInputProps & { node?: unknown }) {
  const isToggleable =
    interactive &&
    onFormControlToggle &&
    (type === "checkbox" || type === "radio");

  const checkedFromProps = Boolean(checked);
  const [optimisticChecked, setOptimisticChecked] = useState<boolean | null>(null);
  const displayChecked = optimisticChecked ?? checkedFromProps;

  useEffect(() => {
    setOptimisticChecked(null);
  }, [checkedFromProps]);

  const handleToggle = () => {
    if (!isToggleable) return;
    if (type === "radio" && displayChecked) return;
    setOptimisticChecked(!displayChecked);
    onFormControlToggle(controlIndex);
  };

  const handleChange: ComponentProps<"input">["onChange"] = (event) => {
    onChange?.(event);
    handleToggle();
  };

  const handleClick: ComponentProps<"input">["onClick"] = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (type === "checkbox") {
      event.stopPropagation();
    }
  };

  return (
    <input
      {...props}
      type={type}
      name={name}
      checked={displayChecked}
      disabled={isToggleable ? undefined : disabled}
      readOnly={isToggleable ? undefined : true}
      className={cn(isToggleable && "markdown-form-control--interactive", className)}
      onChange={handleChange}
      onClick={handleClick}
    />
  );
}
