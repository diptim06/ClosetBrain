import React, {
  Children,
  cloneElement,
  ReactElement,
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
} from 'react';

export type Transition = {
  ease?: string;
  duration?: number;
  type?: string;
  bounce?: number;
  [key: string]: any;
};

export type AnimatedBackgroundProps = {
  children:
    | ReactElement<{ 'data-id': string; className?: string; [key: string]: any }>[]
    | ReactElement<{ 'data-id': string; className?: string; [key: string]: any }>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  transition?: Transition;
  enableHover?: boolean;
};

export function AnimatedBackground({
  children,
  defaultValue,
  value,
  onValueChange,
  className,
  transition,
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(defaultValue ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeRect, setActiveRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const activeId = value !== undefined ? value : internalActiveId;

  const setActive = (id: string | null) => {
    if (value === undefined) {
      setInternalActiveId(id);
    }
    onValueChange?.(id);
  };

  const updateRect = () => {
    if (!containerRef.current || !activeId) {
      setActiveRect(null);
      return;
    }
    const targetEl = containerRef.current.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    if (targetEl) {
      setActiveRect({
        left: targetEl.offsetLeft,
        top: targetEl.offsetTop,
        width: targetEl.offsetWidth,
        height: targetEl.offsetHeight,
      });
    }
  };

  useLayoutEffect(() => {
    updateRect();
  }, [activeId]);

  useEffect(() => {
    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeId]);

  // Duration & easing mapping
  const duration = transition?.duration ?? 0.2;
  const ease =
    transition?.ease === 'easeInOut'
      ? 'cubic-bezier(0.4, 0, 0.2, 1)'
      : transition?.ease === 'easeOut'
      ? 'cubic-bezier(0, 0, 0.2, 1)'
      : transition?.ease === 'easeIn'
      ? 'cubic-bezier(0.4, 0, 1, 1)'
      : typeof transition?.ease === 'string'
      ? transition.ease
      : 'ease-in-out';

  const transitionStyle = `transform ${duration}s ${ease}, width ${duration}s ${ease}, height ${duration}s ${ease}, opacity ${duration}s ${ease}`;

  return (
    <div ref={containerRef} className="relative flex items-center w-full">
      {activeRect && (
        <div
          aria-hidden="true"
          className={className ? `absolute pointer-events-none ${className}` : 'absolute pointer-events-none'}
          style={{
            transform: `translate3d(${activeRect.left}px, ${activeRect.top}px, 0)`,
            width: `${activeRect.width}px`,
            height: `${activeRect.height}px`,
            transition: transitionStyle,
          }}
        />
      )}
      {Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const id = child.props['data-id'];
        const isActive = activeId === id;

        const interactionProps = enableHover
          ? {
              onMouseEnter: (e: React.MouseEvent) => {
                child.props.onMouseEnter?.(e);
                setActive(id);
              },
              onMouseLeave: (e: React.MouseEvent) => {
                child.props.onMouseLeave?.(e);
                setActive(null);
              },
            }
          : {
              onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                setActive(id);
              },
            };

        return cloneElement(child, {
          key: id,
          'data-active': isActive ? 'true' : 'false',
          ...interactionProps,
        });
      })}
    </div>
  );
}
