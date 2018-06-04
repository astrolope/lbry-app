// @flow
import React from 'react';
import { Lbry } from 'lbry-redux';
import classnames from 'classnames';
import type { Claim } from 'types/claim';
import { remote } from 'electron';
import fs from 'fs';

import * as THREE from './internal/Three';

const SPACE_BAR_KEYCODE = 32;

type Props = {
  cancelPlay: () => void,
  fileInfo: {
    outpoint: string,
    file_name: string,
    written_bytes: number,
    download_path: string,
    completed: boolean,
  },
  metadata: ?{
    nsfw: boolean,
    thumbnail: string,
  },
  autoplay: boolean,
  isLoading: boolean,
  isDownloading: boolean,
  playingUri: ?string,
  contentType: string,
  changeVolume: number => void,
  volume: number,
  claim: Claim,
  uri: string,
  doPlay: () => void,
  doPause: () => void,
  savePosition: (string, number) => void,
  mediaPaused: boolean,
  mediaPosition: ?number,
  className: ?string,
  obscureNsfw: boolean,
  play: string => void,
};

class ModelViewer extends React.PureComponent<Props> {
  constructor() {
    super();

    // construct the position vector here, because if we use 'new' within render,
    // React will think that things have changed when they have not.

    (this: any).start = this.start.bind(this);
    (this: any).stop = this.stop.bind(this);
    (this: any).animate = this.animate.bind(this);

    (this: any).loadStl = this.loadStl.bind(this);

    (this: any).playContent = this.playContent.bind(this);
    (this: any).handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    this.handleAutoplay(this.props);
    window.addEventListener('keydown', this.handleKeyDown);
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ color: '#44b098' });
    const cube = new THREE.Mesh(geometry, material);

    const controls = new THREE.OrbitControls(camera);

    const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(light);

    camera.position.z = 4;
    controls.update();

    renderer.setClearColor('#f6f6f6');
    renderer.setSize(width, height);

    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.renderer = renderer;
    this.material = material;
    this.cube = cube;

    this.mount.appendChild(this.renderer.domElement);
    this.loadStl(this.props);
    this.start();
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      this.props.autoplay !== nextProps.autoplay ||
      this.props.fileInfo !== nextProps.fileInfo ||
      this.props.isDownloading !== nextProps.isDownloading ||
      this.props.playingUri !== nextProps.playingUri
    ) {
      this.handleAutoplay(nextProps);
    }
  }

  componentWillUnmount() {
    this.props.cancelPlay();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event: SyntheticKeyboardEvent<*>) {
    //
  }

  handleAutoplay = (props: Props) => {
    const {
      autoplay,
      playingUri,
      fileInfo,
      costInfo,
      isDownloading,
      uri,
      load,
      play,
      metadata,
    } = props;

    const playable = autoplay && playingUri !== uri && metadata && !metadata.nsfw;

    if (playable && costInfo && costInfo.cost === 0 && !fileInfo && !isDownloading) {
      load(uri);
      play(uri);
    } else if (playable && fileInfo && fileInfo.blobs_completed > 0) {
      play(uri);
    }
  };

  isMediaSame(nextProps: Props) {
    return (
      this.props.fileInfo &&
      nextProps.fileInfo &&
      this.props.fileInfo.outpoint === nextProps.fileInfo.outpoint
    );
  }

  playContent() {
    const { play, uri } = this.props;
    play(uri);
  }

  start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  stop() {
    cancelAnimationFrame(this.frameId);
  }

  animate() {
    this.controls.update();
    this.renderScene();
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera);
  }

  loadStl = (props: Props) => {
    const { playingUri, fileInfo, costInfo, isDownloading, uri, load, play, metadata } = props;

    console.log(THREE, props, this.file(), process.env.HOME || process.env.USERPROFILE);
    const loader = new THREE.STLLoader();

    loader.load(`file://${props.fileInfo.download_path}`, geometry => {
      const material = new THREE.MeshPhongMaterial({
        color: 0x44b098,
        specular: 0x111111,
        shininess: 200,
      });
      // let material = new THREE.MeshBasicMaterial({ color: '#44b098' });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(0, -0.25, 0.6);
      mesh.rotation.set(0, -Math.PI / 2, 0);
      mesh.scale.set(0.5, 0.5, 0.5);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.scene.add(mesh);
    });
  };

  file() {
    const { downloadPath, filename } = this.props;

    return {
      name: filename,
      createReadStream: opts => fs.createReadStream(this.props.fileInfo.download_path, opts),
    };
  }

  render() {
    const {
      metadata,
      isLoading,
      isDownloading,
      playingUri,
      fileInfo,
      contentType,
      changeVolume,
      volume,
      claim,
      uri,
      doPlay,
      doPause,
      savePosition,
      mediaPaused,
      mediaPosition,
      className,
      obscureNsfw,
    } = this.props;

    const height = 600;
    const width = 800;

    console.log(fileInfo);

    const isPlaying = playingUri === uri;
    const isReadyToPlay = fileInfo && fileInfo.written_bytes > 0;
    const shouldObscureNsfw = obscureNsfw && metadata && metadata.nsfw;
    const mediaType = Lbry.getMediaType(contentType, fileInfo && fileInfo.file_name);

    let loadStatusMessage = '';

    if (fileInfo && fileInfo.completed && !fileInfo.written_bytes) {
      loadStatusMessage = __(
        "It looks like you deleted or moved this file. We're rebuilding it now. It will only take a few seconds."
      );
    } else if (isLoading) {
      loadStatusMessage = __('Requesting stream...');
    } else if (isDownloading) {
      loadStatusMessage = __('Downloading stream... not long left now!');
    }

    const poster = metadata && metadata.thumbnail;
    const layoverClass = classnames('content__cover', { 'card__media--nsfw': shouldObscureNsfw });
    const layoverStyle =
      !shouldObscureNsfw && poster ? { backgroundImage: `url("${poster}")` } : {};

    return (
      <div className={classnames('video', {}, className)}>
        <div
          style={{ width, height }}
          ref={mount => {
            this.mount = mount;
          }}
        />
      </div>
    );
  }
}

export default ModelViewer;
