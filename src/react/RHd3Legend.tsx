 
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Hd3ForeignObjectLegendContainer } from '../core/legend/Hd3ForeignObjectLegend';
import { Hd3LegendData } from '../core/legend/Hd3LegendManager';
import { VRHd3LegendManager } from '../core/VRHd3LegendManager';
import { Hd3SeriesRenderer } from '../core/series/Hd3SeriesRenderer';
import { getHd3GlobalBus } from '../core/bus/Hd3Bus';
import { Hd3Chart } from '../core';

interface RHd3LegendProps {
  legendManager: VRHd3LegendManager;
  children?: (data: Hd3LegendData, chart:Hd3Chart) => React.ReactNode;
}

function toggleVisibility(renderer: Hd3SeriesRenderer) {
  renderer.visible = !renderer.visible;
}

export function RHd3Legend({ legendManager, children }: RHd3LegendProps) {
  const [legendTargets, setLegendTargets] = useState<Hd3ForeignObjectLegendContainer[] | undefined>();

  useEffect(() => {
    function handleLegendChanged() {
      setLegendTargets([...legendManager.foLegend.getContainers()]);
    }

    const bus = getHd3GlobalBus();
    const manager = legendManager.manager;
    bus.on(manager.e.changed, handleLegendChanged);
    // Get initial state
    handleLegendChanged();

    return () => {
      bus.off(manager.e.changed, handleLegendChanged);
    };
  }, [legendManager]);

  if (!legendTargets) {return null;}

  return (
    <>
      {legendTargets.map((target) =>
        createPortal(
          <div key={target.chart.id}>
            {target.data && (
              children ? (
                children(target.data, target.chart)
              ) : (
                target.data.series.map((s) => (
                  <div
                    key={s.renderer.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      margin: '2px 4px',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                    }}
                    onClick={() => toggleVisibility(s.renderer)}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: s.color,
                        marginRight: '4px',
                        opacity: s.visible ? 1 : 0.3,
                      }}
                    />
                    <span style={{ opacity: s.visible ? 1 : 0.5 }}>
                      {s.renderer.name}
                    </span>
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
