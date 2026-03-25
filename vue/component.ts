import { defineComponent, h, type PropType } from 'vue'

export default defineComponent({
    name: 'CssIcon',
    props: {
        className: {
            type: String as PropType<string>,
            required: true,
        },
    },
    setup(props) {
        return () => h('i', { class: ['icon', props.className] })
    },
})