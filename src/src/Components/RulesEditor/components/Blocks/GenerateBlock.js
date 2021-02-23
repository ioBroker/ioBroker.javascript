import GenericBlock from '../GenericBlock';
import Compile from "../../Compile";

class GenerateBlock extends GenericBlock {
    constructor(props) {
        super(props, GenerateBlock.getStaticData());
    }

    static compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: GenerateBlock.getStaticDataParams().inputsGenerate
        });
    }

    getStaticData = () => {
        return GenerateBlock.getStaticDataParams().dataGenerate
    }


    static getStaticDataParams = () => {
        return {
            inputsGenerate:[],
            dataGenerate:{}
        }
    }
}

export default GenerateBlock;
