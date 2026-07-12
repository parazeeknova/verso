import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Alert } from "@mantine/core";
import {
  IconInfoCircle,
  IconCheck,
  IconExclamationCircle,
  IconAlertCircle,
} from "@tabler/icons-react";
import classes from "./callout.module.css";

export type CalloutType = "info" | "success" | "warning" | "danger";

interface CalloutConfig {
  icon: React.ComponentType<{ size?: number }>;
  color: string;
}

const calloutConfigs: Record<CalloutType, CalloutConfig> = {
  danger: {
    color: "red",
    icon: IconAlertCircle,
  },
  info: {
    color: "blue",
    icon: IconInfoCircle,
  },
  success: {
    color: "green",
    icon: IconCheck,
  },
  warning: {
    color: "yellow",
    icon: IconExclamationCircle,
  },
};

export default function CalloutView(props: NodeViewProps) {
  const { node } = props;
  const { type, icon } = node.attrs as { type: CalloutType; icon?: string };
  const config = calloutConfigs[type] || calloutConfigs.info;
  const IconComponent = config.icon;

  const renderedIcon =
    icon && icon.trim() !== "" ? (
      <span style={{ fontSize: "18px" }}>{icon}</span>
    ) : (
      <IconComponent size={20} />
    );

  return (
    <NodeViewWrapper className="callout-wrapper">
      <Alert
        variant="light"
        color={config.color}
        radius="none"
        icon={renderedIcon}
        classNames={{
          icon: classes.icon,
          message: classes.message,
          root: classes.root,
        }}
      >
        <NodeViewContent />
      </Alert>
    </NodeViewWrapper>
  );
}
