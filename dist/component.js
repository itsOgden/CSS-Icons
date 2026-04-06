// vue/CssIcon.ts
import { defineComponent, h } from "vue";
import { getIconClass } from "virtual:css-icons/data";
var CssIcon_default = defineComponent({
  name: "CssIcon",
  props: {
    icon: {
      type: String,
      required: true
    },
    useWidth: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    return () => h("i", {
      class: ["icon", getIconClass(props.icon), props.useWidth ? "scale-width" : ""].filter(Boolean).join(" ")
    });
  }
});
export {
  CssIcon_default as default
};
