 
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Hd3ForeignObjectTooltipContainer } from '../core/tooltip/Hd3ForeignObjectTooltip';
import { VRHd3TooltipManager } from '../core/VRHd3TooltipManager';
import { getHd3GlobalBus } from '../core/bus/Hd3Bus';
import { Hd3Chart, Hd3TooltipData } from '../core';

interface RHd3TooltipProps {
  tooltipManager: VRHd3TooltipManager;
  children?: (data: Hd3TooltipData, chart: Hd3Chart) => React.ReactNode;
}

export function RHd3Tooltip({ tooltipManager, children }: RHd3TooltipProps) {
  const [tooltipTargets, setTooltipTargets] = useState<Hd3ForeignObjectTooltipContainer[] | undefined>();

  useEffect(() => {
    function handleTooltipChanged() {
      setTooltipTargets(tooltipManager.foTooltip.getContainers());
    }

    const bus = getHd3GlobalBus();
    const manager = tooltipManager.manager
    bus.on(manager.e.show, handleTooltipChanged);
    bus.on(manager.e.hide, handleTooltipChanged);

    return () => {
      bus.off(manager.e.show, handleTooltipChanged);
      bus.off(manager.e.hide, handleTooltipChanged);
    };
  }, [tooltipManager]);

  if (!tooltipTargets) {return null;}

  return (
    <>
      {tooltipTargets.map((target) =>
        createPortal(
          <div key={target.container.id}>
            {target.data && (
              children ? (
                children(target.data, target.chart)
              ) : (
                target.data.series.map((s) => (
                  <div key={s.renderer.name} style={{ margin: '2px 0' }}>
                    <strong>{s.renderer.name}:</strong> {s.y.toFixed(2)}
                  </div>
                ))
              )
            )}
          </div>,
          target.container
        )
      )}
    </>
  );
}
