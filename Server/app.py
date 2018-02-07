import sys
import os

from wslink import register
from wslink.websocket import LinkProtocol

import itk
from itkTypes import itkCType

# Preload ITK modules (i.e. no lazy load for these modules)
itk.ImageIOFactory
itk.Image
itk.ImageFileReader
itk.CompositeTransform
itk.TranslationTransform
itk.ScaleTransform
itk.SegmentTubes

# default to float pixeltype
ImageType = itk.Image[itk.F, 3]

NO_TUBE = -1

def counter(start=0, delta=1):
    c = start
    while True:
        yield c
        c += delta

def loadImage(filename):
    base = itk.ImageIOFactory.CreateImageIO(filename, itk.ImageIOFactory.ReadMode)
    if base is None:
        raise Exception('Cannot read file {}'.format(filename))

    base.SetFileName(filename)
    base.ReadImageInformation()

    reader = itk.ImageFileReader[ImageType].New()
    reader.SetFileName(filename)
    reader.Update()

    return reader.GetOutput()

def get_tube_points(tube):
    '''Returns a list of tube points and radii.

    This will transform the points to world space.
    '''
    points = list()
    radii = list()
    tube.ComputeObjectToWorldTransform()
    t = tube.GetIndexToWorldTransform()
    # assumes 3D
    scale = sum(t.GetMatrix()(i, i) for i in range(3)) / 3.0

    for i in range(tube.GetNumberOfPoints()):
        point = tube.GetPoint(i)

        # Get radius via str() output b/c point is a SpatialObjectPoint, which
        # currently cannot be downcasted to a VesselTubeSpatialObjectPoint.
        radius = float(str(point).split('\n')[3].strip()[len('R: '):])
        position = t.TransformPoint(point.GetPosition())

        points.append((position[0], position[1], position[2]))
        radii.append(radius * scale)
    return points, radii

class AppProtocol(LinkProtocol):
    def __init__(self):
        super().__init__()
        self.curImageId = 1
        self.loadedImages = dict()

    @register('app.load_file')
    def load_file(self, filename):
        image = loadImage(filename)
        imgId = self.curImageId
        self.curImageId += 1

        segmenter = itk.SegmentTubes[ImageType].New()
        spacing = image.GetSpacing()
        origin = image.GetOrigin()
        direction = image.GetDirection()

        segmenter.SetInputImage(image)
        segmenter.SetDebug(True)

        # TODO do I need this?
        segmenter.GetTubeGroup().GetObjectToParentTransform().SetScale(spacing)
        segmenter.GetTubeGroup().GetObjectToParentTransform().SetOffset(origin)
        segmenter.GetTubeGroup().GetObjectToParentTransform().SetMatrix(direction)
        segmenter.GetTubeGroup().ComputeObjectToWorldTransform()

        # the image to world transform
        # TODO do I need to handle direction?
        imgToWorldT = itk.AffineTransform[itk.D, 3].New()
        # post-multiply scheme (multiply on the left of existing matrix)
        imgToWorldT.Scale(spacing)
        imgToWorldT.Translate(origin)

        self.loadedImages[imgId] = {
            'filename': filename,
            'image': image,
            'segmenter': segmenter,
            'imgToWorldT': imgToWorldT,
            # the actual tube ID counter
            'tubeIdCounter': counter(),
            # The UID counter used to uniquely identify tubes
            # This is b/c tube ID may not be unique when tubes
            # are imported.
            'tubeUIDCounter': counter(),
            'tubes': dict()
        }
        return imgId

    @register('app.unload_image')
    def unload_image(self, imgId):
        if imgId in self.loadedImages:
            del self.loadedImages[imgId]

    @register('app.segment')
    def segment(self, imgId, coord, params):
        bundle = self.loadedImages[imgId]

        # given coord is in ijk space
        point = itk.Point[itk.D, 3](bundle['imgToWorldT'].TransformPoint(coord))
        index = bundle['image'].TransformPhysicalPointToContinuousIndex(point)

        scaleNorm = sum(bundle['image'].GetSpacing()) / 3.0
        if params['scale'] / scaleNorm < 0.3:
            raise Exception('scale/scaleNorm < 0.3')

        bundle['segmenter'].SetRadius(params['scale'] / scaleNorm)
        # the tube ID will be set if a tube is extracted
        tube = bundle['segmenter'].ExtractTube(index, 0, True)

        if tube:
            tubeId = next(bundle['tubeIdCounter'])
            tubeUID = next(bundle['tubeUIDCounter'])

            tube.SetId(tubeId)
            bundle['segmenter'].AddTube(tube)
            bundle['tubes'][tubeUID] = tube

            points, radii = get_tube_points(tube)
            return {
                'uid': tubeUID,
                'points': points,
                'radii': radii,
            }
        else:
            return { 'uid': NO_TUBE }
