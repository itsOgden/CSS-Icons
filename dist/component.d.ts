import * as vue from 'vue';
import { PropType } from 'vue';
import { CssIconName } from 'virtual:css-icons/data';

declare const _default: vue.DefineComponent<vue.ExtractPropTypes<{
    icon: {
        type: PropType<CssIconName>;
        required: true;
    };
    useWidth: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    icon: {
        type: PropType<CssIconName>;
        required: true;
    };
    useWidth: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    useWidth: boolean;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

export { _default as default };
