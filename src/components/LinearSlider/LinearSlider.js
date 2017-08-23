import React, { PureComponent } from "react";
import warning from "warning";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import { scaleLinear, scaleQuantize } from "d3-scale";
import { mode1, mode2 } from "./modes";
import { getStepRange, updateValues, getSliderDomain } from "./utils";

const noop = () => {};

class ScaledSlider extends PureComponent {
  scale = scaleLinear().range([0, 100]).clamp(true);

  valueToStep = scaleQuantize();
  pixelToStep = scaleQuantize();

  state = { values: [] };

  componentWillMount() {
    const { domain: [min, max], defaultValues, step } = this.props;
    const range = getStepRange(min, max, step);

    warning(
      range.length <= 10001,
      `React Electric Slide: Increase step value. Found ${range.length.toLocaleString()} values in range.`
    );

    warning(
      range[0] === min && range[range.length - 1] === max,
      `React Electric Slide: The range is incorrectly calculated consider changing step value.`
    );

    this.valueToStep.range(range).domain([min - step / 2, max + step / 2]);
    this.pixelToStep.range(range);

    this.setState(() => {
      const values = [];
      const pushed = {};

      defaultValues.forEach(({ key, val }) => {
        const v0 = this.valueToStep(val);

        warning(
          v0 === val,
          `React Electric Slide: Invalid default value. Changing ${val} to ${v0}.`
        );

        warning(
          !pushed[key],
          `React Electric Slide: No duplicate keys allowed. Skipping "${key}" key.`
        );

        if (!pushed[key]) {
          pushed[key] = true;
          values.push({ key, val: v0 });
        }
      });

      return { values };
    });
  }

  onMouseDown = e => {
    const { handles, props: { vertical = false } } = this;

    e.stopPropagation();
    e.preventDefault();

    const active = Object.keys(handles).find(key => {
      return e.target === this.handles[key].node;
    });

    if (active) {
      this.marker = vertical ? e.clientY : e.pageX;
      this.offset = 0;
      this.active = active;
      this.addMouseEvents();
    }
  };

  onMouseMove = e => {
    const { state: { values: prev }, props: { vertical, domain, mode } } = this;
    const { active, slider } = this;

    this.pixelToStep.domain(getSliderDomain(slider));

    const step = this.pixelToStep(vertical ? e.clientY : e.pageX);
    const next = updateValues(prev, active, step);

    if (next !== prev) {
      let values;

      switch (mode) {
        case 1:
          values = mode1(prev, next);
          break;
        case 2:
          values = mode2(prev, next);
          break;
        default:
          values = next;
          warning(false, "React Electric Slide: Invalid mode value.");
      }

      this.setState({ values });
    }
  };

  onMouseUp = e => {
    this.removeMouseEvents();
  };

  addMouseEvents() {
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  removeMouseEvents() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  slider = null;
  handles = {};

  saveHandle(key, node) {
    this.handles[key] = { key, node: findDOMNode(node) };
  }

  render() {
    const {
      state: { values },
      props: {
        domain,
        disabled,
        vertical,
        knob: Knob,
        rail: Rail,
        link: Link,
        tick: Tick,
        className
      }
    } = this;

    this.scale.domain(domain);

    let ticks = this.scale.ticks();
    let links = null;

    if (Link) {
      links = [];

      for (let i = 0; i < values.length + 1; i++) {
        const s = values[i - 1];
        const t = values[i];

        links.push(
          <Link
            key={`${s ? s.key : "$"}-${t ? t.key : "$"}`}
            index={i}
            count={values.length}
            scale={this.scale}
            source={s || null}
            target={t || null}
          />
        );
      }
    }

    return (
      <div
        className={className}
        ref={node => (this.slider = node)}
        onMouseDown={disabled ? noop : this.onMouseDown}
      >
        <Rail />
        {links}
        <div className="rc-slider-step" />
        {values.map(({ key, val }, index) =>
          <Knob
            key={key}
            ref={node => this.saveHandle(key, node)}
            index={index}
            value={val}
            scale={this.scale}
          />
        )}
        {ticks.map((val, index) =>
          <Tick
            key={`key-${val}`}
            index={index}
            count={values.length}
            value={val}
            scale={this.scale}
          />
        )}
      </div>
    );
  }
}

ScaledSlider.propTypes = {
  knob: PropTypes.any.isRequired,
  link: PropTypes.any.isRequired,
  rail: PropTypes.any.isRequired,
  tick: PropTypes.any.isRequired,
  step: PropTypes.number.isRequired,
  mode: PropTypes.oneOf([1, 2]).isRequired,
  domain: PropTypes.arrayOf(PropTypes.number).isRequired,
  className: PropTypes.string.isRequired,
  defaultValues: PropTypes.arrayOf(PropTypes.object).isRequired
};

ScaledSlider.defaultProps = {
  mode: 1,
  step: 0.1
};

export default ScaledSlider;