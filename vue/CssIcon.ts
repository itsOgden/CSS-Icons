import { defineComponent, h, type PropType } from 'vue'
import { getIconClass, type CssIconName } from 'virtual:css-icons/data'

export default defineComponent({
    name: 'CssIcon',
    props: {
        icon: {
            type: String as PropType<CssIconName>,
            required: true,
        },
        useWidth: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        return () => h('i', {
            class: ['icon', getIconClass(props.icon), props.useWidth ? 'scale-width' : ''].filter(Boolean).join(' '),
        })
    },
})