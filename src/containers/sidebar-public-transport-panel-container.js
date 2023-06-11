import SidebarPublicTransportPanel from "../components/sidebar-public-transport-panel";
import { connect } from "react-redux";
import {
  setMapnificentDuration,
  setMapnificentEnabled
} from "../actions/mapnificent-actions";

export default connect(
  (state) => ({
    isEnabled: state.mapnificent.isEnabled,
    duration: state.mapnificent.duration
  }),
  (dispatch) => ({
    setIsEnabled: (isEnabled) => dispatch(setMapnificentEnabled({ isEnabled })),
    setDuration: (duration) => dispatch(setMapnificentDuration({ duration }))
  })
)(SidebarPublicTransportPanel);
