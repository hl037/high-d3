import { describe, it, expect } from 'vitest';
import { createHd3Bus } from '../src/core/bus/Hd3Bus';
import { Hd3BusEndpoint } from '../src/core/bus/Hd3BusEndpoint';
import { Hd3XAxis } from '../src/core/axis/Hd3XAxis';
import { Hd3YAxis } from '../src/core/axis/Hd3YAxis';
import { Hd3Series } from '../src/core/series/Hd3Series';

describe('Hd3Bus', () => {
  it('should create a bus', () => {
    const bus = createHd3Bus();
    expect(bus).toBeDefined();
  });

  it('should emit and receive events', () => {
    const bus = createHd3Bus();
    let received = false;
    bus.on('test', () => { received = true; });
    bus.emit('test');
    expect(received).toBe(true);
  });
});

describe('Hd3BusEndpoint', () => {
  it('should register listeners when bus is set', () => {
    const bus = createHd3Bus();
    let called = false;
    const endpoint = new Hd3BusEndpoint({
      listeners: {
        test: () => { called = true; }
      }
    });
    endpoint.bus = bus;
    bus.emit('test');
    expect(called).toBe(true);
  });

  it('should call lifecycle hooks', () => {
    const bus = createHd3Bus();
    let beforeAdd = false;
    let afterAdd = false;
    
    const endpoint = new Hd3BusEndpoint({
      listeners: {},
      hooks: {
        beforeAdd: () => { beforeAdd = true; },
        afterAdd: () => { afterAdd = true; }
      }
    });
    
    endpoint.bus = bus;
    expect(beforeAdd).toBe(true);
    expect(afterAdd).toBe(true);
  });
});

describe('Hd3XAxis', () => {
  it('should create an x axis', () => {
    const axis = new Hd3XAxis({ name: 'x1' });
    expect(axis.name).toBe('x1');
  });

  it('should update domain', () => {
    const axis = new Hd3XAxis({ name: 'x1', domain: [0, 10] });
    let domainChanged = false;
    axis.on('domainChanged', () => { domainChanged = true; });
    axis.domain = [0, 20];
    expect(domainChanged).toBe(true);
    expect(axis.domain).toEqual([0, 20]);
  });
});

describe('Hd3YAxis', () => {
  it('should create a y axis', () => {
    const axis = new Hd3YAxis({ name: 'y1' });
    expect(axis.name).toBe('y1');
  });

  it('should support logarithmic scale', () => {
    const axis = new Hd3YAxis({ name: 'y1', logarithmic: true, logBase: 10 });
    expect(axis.logarithmic).toBe(true);
    expect(axis.logBase).toBe(10);
  });
});

describe('Hd3Series', () => {
  it('should create a series', () => {
    const series = new Hd3Series({ name: 's1', data: [[0, 1], [1, 2]] });
    expect(series.name).toBe('s1');
    expect(series.data).toHaveLength(2);
  });

  it('should normalize Data1D to Data2D', () => {
    const series = new Hd3Series({ name: 's1', data: [1, 2, 3] });
    expect(series.data).toEqual([[0, 1], [1, 2], [2, 3]]);
  });

  it('should normalize Data2DObj to Data2D', () => {
    const series = new Hd3Series({ name: 's1', data: [{ x: 0, y: 1 }, { x: 1, y: 2 }] });
    expect(series.data).toEqual([[0, 1], [1, 2]]);
  });

  it('should emit visibility change', () => {
    const series = new Hd3Series({ name: 's1', data: [] });
    let visibilityChanged = false;
    series.on('visibilityChanged', () => { visibilityChanged = true; });
    series.setVisible(false);
    expect(visibilityChanged).toBe(true);
  });
});
