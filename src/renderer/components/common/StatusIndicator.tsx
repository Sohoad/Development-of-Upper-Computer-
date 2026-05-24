interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'warning';
  size?: number;
  style?: React.CSSProperties;
}

function StatusIndicator({ status, size = 8, style }: StatusIndicatorProps) {
  return (
    <span
      className={`status-indicator ${status}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        ...style,
      }}
    />
  );
}

export default StatusIndicator;