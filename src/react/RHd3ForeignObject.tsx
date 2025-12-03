import { useEffect, useState, useMemo, CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Hd3ForeignObjectAnchor, Hd3ForeignObjectAnchorContainer } from '../core/foreign-object/Hd3ForeignObjectAnchor';
import { getHd3GlobalBus } from '../core/bus/Hd3Bus';

export interface RHd3ForeignObjectAnchorPoint {
  x: number;
  y: number;
}

interface RHd3ForeignObjectProps {
  foAnchor: Hd3ForeignObjectAnchor;
  x: number;
  y: number;
  width: number;
  height: number;
  anchor?: RHd3ForeignObjectAnchorPoint;
  children?: ReactNode;
}

export function RHd3ForeignObject({
  foAnchor,
  x,
  y,
  width,
  height,
  anchor = { x: 0, y: 0 },
  children,
}: RHd3ForeignObjectProps) {
  const [containers, setContainers] = useState<Hd3ForeignObjectAnchorContainer[]>([]);

  useEffect(() => {
    function handleChanged() {
      setContainers(foAnchor.getContainers());
    }

    const bus = getHd3GlobalBus();
    bus.on(foAnchor.e.changed, handleChanged);
    handleChanged();

    return () => {
      bus.off(foAnchor.e.changed, handleChanged);
    };
  }, [foAnchor]);

  const style = useMemo<CSSProperties>(() => {
    const translateX = -(0.5 + anchor.x * 0.5) * 100;
    const translateY = -(0.5 + anchor.y * 0.5) * 100;

    return {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${translateX}%, ${translateY}%)`,
    };
  }, [x, y, width, height, anchor.x, anchor.y]);

  if (containers.length === 0) { return null; }

  return (
    <>
      {containers.map((target) =>
        createPortal(
          <div key={target.chart.id} style={style}>
            {children}
          </div>,
          target.container
        )
      )}
    </>
  );
}
